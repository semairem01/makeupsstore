using makeup.Models.Repositories;
using makeup.Models.Repositories.Entities;
using makeup.Models.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using makeup.Infrastructure.Email;
using makeup.Infrastructure;

static string ConvertPostgresUrlToNpgsql(string databaseUrl)
{
    var uri = new Uri(databaseUrl);
    var db = uri.AbsolutePath.TrimStart('/');
    var userInfo = uri.UserInfo.Split(':', 2);

    var username = userInfo[0];
    var password = userInfo.Length > 1 ? userInfo[1] : "";

    return $"Host={uri.Host};Port={uri.Port};Database={db};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
}

var builder = WebApplication.CreateBuilder(args);

// JSON
builder.Services
    .AddControllersWithViews()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        o.JsonSerializerOptions.NumberHandling = JsonNumberHandling.AllowReadingFromString;
    });

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                // origin boşsa engelle
                if (string.IsNullOrWhiteSpace(origin)) return false;

                // localhost (dev)
                if (origin.StartsWith("http://localhost:")) return true;

                // netlify preview + production url'leri
                if (origin.EndsWith(".netlify.app")) return true;

                // (varsa) kendi domainini buraya ekle
                // if (origin == "https://www.senin-domainin.com") return true;

                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});


// DB Context (Dev: MSSQL, Prod: Postgres)
builder.Services.AddDbContext<AppDbContext>(options =>
{
    string cs;
    
    if (builder.Environment.IsDevelopment())
    {
        cs = builder.Configuration.GetConnectionString("Postgres")
             ?? builder.Configuration.GetConnectionString("SqlServer")
             ?? throw new Exception("Development ortamında connection string bulunamadı.");
        
        // 🔍 DEBUG: Hangi connection string kullanılıyor?
        Console.WriteLine("🔍 DEVELOPMENT - Connection String: " + cs);
    }
    else
    {
        cs = builder.Configuration["DATABASE_URL"]
             ?? builder.Configuration.GetConnectionString("Postgres")
             ?? throw new Exception("Production ortamında connection string bulunamadı.");
        
        Console.WriteLine("🔍 PRODUCTION - Connection String: " + 
                          (cs.Contains("railway") ? "Railway PostgreSQL" : cs));
    }

    if (cs.StartsWith("postgres://") || cs.StartsWith("postgresql://"))
        cs = ConvertPostgresUrlToNpgsql(cs);

    options.UseNpgsql(cs);
});

builder.Services.Configure<ApiBehaviorOptions>(opt =>
{
    opt.InvalidModelStateResponseFactory = ctx =>
        new BadRequestObjectResult(new ValidationProblemDetails(ctx.ModelState));
});

// Identity
builder.Services.AddIdentity<AppUser, AppRole>(options =>
{
    options.Password.RequiredLength = 6;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;

    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    options.User.RequireUniqueEmail = true;
    options.SignIn.RequireConfirmedEmail = false;
    options.SignIn.RequireConfirmedAccount = false;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// JWT
var jwtKey = builder.Configuration["JWT:Key"]
             ?? builder.Configuration["JWT__Key"]  // env’de genelde bu kullanılır
             ?? "CHANGE_ME_IN_PROD___super-secret-key";

var jwtIssuer = builder.Configuration["JWT:Issuer"] ?? "MakeupStore";
var jwtAudience = builder.Configuration["JWT:Audience"] ?? "MakeupStore";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireClaim("IsAdmin", "True"));
    options.AddPolicy("UserOrAdmin", policy => policy.RequireAuthenticatedUser());
});

// Repos
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<ICartItemRepository, CartItemRepository>();
builder.Services.AddScoped<INotifyRequestRepository, NotifyRequestRepository>();

// Services
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<ICartItemService, CartItemService>();
builder.Services.AddScoped<IRecommendService, RecommendService>();
builder.Services.AddScoped<IPurchaseReadService, PurchaseReadService>();
builder.Services.AddScoped<IEmailSender, GmailEmailSender>();
builder.Services.AddSingleton<GeoFileStore>();

builder.Services.AddHttpContextAccessor();

var app = builder.Build();
// 🔎 DEBUG: Hangi DB'ye bağlıyım?
using (var scope = app.Services.CreateScope())
{
    var cfg = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    Console.WriteLine("ENV: " + app.Environment.EnvironmentName);
    Console.WriteLine("CS (SqlServer key): " + cfg.GetConnectionString("SqlServer"));
    Console.WriteLine("DATABASE_URL: " + cfg["DATABASE_URL"]);
}


// ✅ Health endpoint (Run’dan önce!)
app.MapGet("/health", () => Results.Ok("OK"));

// Middleware
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}
else
{
    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

// CORS auth’dan önce
app.UseCors("AllowReact");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapControllers();

// ✅ DB migrate + Admin seed (Production’da da çalışır)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        await context.Database.MigrateAsync();

        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        var roleManager = services.GetRequiredService<RoleManager<AppRole>>();

        // Roles
        var adminRoleName = "Admin";
        var userRoleName = "User";

        if (await roleManager.FindByNameAsync(adminRoleName) == null)
            await roleManager.CreateAsync(new AppRole(adminRoleName) { Description = "Sistem yöneticisi" });

        if (await roleManager.FindByNameAsync(userRoleName) == null)
            await roleManager.CreateAsync(new AppRole(userRoleName) { Description = "Normal kullanıcı" });

        // Admin from env
        var adminEmail = app.Configuration["ADMIN_EMAIL"];
        var adminUsername = app.Configuration["ADMIN_USERNAME"] ?? "admin";
        var adminPassword = app.Configuration["ADMIN_PASSWORD"];

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            Console.WriteLine("ADMIN_EMAIL / ADMIN_PASSWORD tanımlı değil. Admin seed atlandı.");
        }
        else
        {
            var adminUser = await userManager.FindByEmailAsync(adminEmail);
            if (adminUser == null)
            {
                adminUser = new AppUser
                {
                    Id = Guid.NewGuid(),
                    UserName = adminUsername,
                    Email = adminEmail,
                    EmailConfirmed = true,
                    IsAdmin = true
                };

                var result = await userManager.CreateAsync(adminUser, adminPassword);
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(adminUser, adminRoleName);
                    Console.WriteLine($"Default admin created: {adminEmail}");
                }
                else
                {
                    Console.WriteLine("Failed to create admin: " +
                        string.Join(", ", result.Errors.Select(e => e.Description)));
                }
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Startup migrate/seed error: {ex.Message}");
    }
}

app.Run();

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

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllersWithViews()
    .AddJsonOptions(o =>
    {
        
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        // EF navigation loop'ları patlatmasın
        o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        o.JsonSerializerOptions.NumberHandling = JsonNumberHandling.AllowReadingFromString;
    });

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact",
        builder => builder
            .WithOrigins("http://localhost:3000", "http://localhost:3001" ,"http://localhost:3002","http://localhost:3003")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

// Database Context
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("SqlServer"));
});

builder.Services.Configure<ApiBehaviorOptions>(opt =>
{
    opt.InvalidModelStateResponseFactory = ctx =>
        new BadRequestObjectResult(new ValidationProblemDetails(ctx.ModelState));
});

// Identity Configuration
builder.Services.AddIdentity<AppUser, AppRole>(options =>
{
    // Password requirements
    options.Password.RequiredLength = 6;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;
    
    // Lockout settings
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;
    
    // User settings
    options.User.RequireUniqueEmail = true;
    options.SignIn.RequireConfirmedEmail = false; // Email confirmation şimdilik kapalı
    options.SignIn.RequireConfirmedAccount = false;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// JWT Authentication
var jwtKey = builder.Configuration["JWT:Key"] ?? "your-super-secret-key-here-make-it-longer-than-256-bits-for-security-purposes";
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
    
    // SignalR için gerekli (ileride kullanabilirsiniz)
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
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireClaim("IsAdmin", "True"));
    
    options.AddPolicy("UserOrAdmin", policy =>
        policy.RequireAuthenticatedUser());
});

// Repositories
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

// Build the app
var app = builder.Build();

// Create default admin user
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        var roleManager = services.GetRequiredService<RoleManager<AppRole>>(); // AppRole kullan
        var context = services.GetRequiredService<AppDbContext>();
        
        // Ensure database is created
        await context.Database.EnsureCreatedAsync();
        
        // Create default roles
        var adminRoleName = "Admin";
        var userRoleName = "User";
        
        var adminRole = await roleManager.FindByNameAsync(adminRoleName);
        if (adminRole == null)
        {
            adminRole = new AppRole(adminRoleName) { Description = "Sistem yöneticisi" };
            await roleManager.CreateAsync(adminRole);
        }
        
        var userRole = await roleManager.FindByNameAsync(userRoleName);
        if (userRole == null)
        {
            userRole = new AppRole(userRoleName) { Description = "Normal kullanıcı" };
            await roleManager.CreateAsync(userRole);
        }
        
        // Create default admin user if not exists
        var adminEmail = "admin@makeup.com";
        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        
        if (adminUser == null)
        {
            adminUser = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = "admin",
                Email = adminEmail,
                EmailConfirmed = true,
                IsAdmin = true
            };
            
            var result = await userManager.CreateAsync(adminUser, "Admin123!");
            if (result.Succeeded)
            {
                // Admin rolünü kullanıcıya ata
                await userManager.AddToRoleAsync(adminUser, adminRoleName);
                Console.WriteLine($"Default admin user created: {adminEmail} / Admin123!");
            }
            else
            {
                Console.WriteLine("Failed to create admin user: " + string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error creating admin user: {ex.Message}");
    }
}

// Middleware pipeline
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

// CORS - Authentication'dan önce olmalı
app.UseCors("AllowReact");

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapControllers();

app.Run();
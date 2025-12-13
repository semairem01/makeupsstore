# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# kopyala + restore
COPY ["makeup/makeup.csproj", "makeup/"]
# eğer başka projeler varsa onları da COPY et
# COPY ["SomeProject/SomeProject.csproj", "SomeProject/"]

RUN dotnet restore "makeup/makeup.csproj"

# tüm kaynak
COPY . .

# publish
WORKDIR /src/makeup
RUN dotnet publish "makeup.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "makeup.dll"]

# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["./Directory.Build.props", "./"]
COPY ["src/Domain/SteamAdminPanel.Domain.csproj", "src/Domain/"]
COPY ["src/Application/SteamAdminPanel.Application.csproj", "src/Application/"]
COPY ["src/Infrastructure/SteamAdminPanel.Infrastructure.csproj", "src/Infrastructure/"]
COPY ["src/API/SteamAdminPanel.Api.csproj", "src/API/"]
RUN dotnet restore "src/API/SteamAdminPanel.Api.csproj"

COPY . .
WORKDIR /src/src/API
RUN dotnet publish "SteamAdminPanel.Api.csproj" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SteamAdminPanel.Api.dll"]
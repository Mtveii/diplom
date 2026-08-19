#!/usr/bin/env bash
cd "$(dirname "$0")/backend"
export PATH="$HOME/.dotnet:$PATH"
dotnet watch run --project src/API/SteamAdminPanel.Api.csproj

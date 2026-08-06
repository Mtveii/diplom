using System.Security.Cryptography;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Infrastructure.Authentication;

/// <summary>
/// PBKDF2 (Rfc2898DeriveBytes) хэширование паролей с солью.
/// </summary>
public sealed class Pbkdf2PasswordHasher : IPasswordHasher
{
    private const int Iterations = 100_000;
    private const int SaltSize = 16;
    private const int HashSize = 32;

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Iterations,
            HashAlgorithmName.SHA256,
            HashSize);

        var result = new byte[SaltSize + HashSize];
        Buffer.BlockCopy(salt, 0, result, 0, SaltSize);
        Buffer.BlockCopy(hash, 0, result, SaltSize, HashSize);

        return Convert.ToBase64String(result);
    }

    public bool Verify(string password, string storedHash)
    {
        var storedBytes = Convert.FromBase64String(storedHash);
        if (storedBytes.Length != SaltSize + HashSize)
        {
            return false;
        }

        var salt = new byte[SaltSize];
        var expectedHash = new byte[HashSize];
        Buffer.BlockCopy(storedBytes, 0, salt, 0, SaltSize);
        Buffer.BlockCopy(storedBytes, SaltSize, expectedHash, 0, HashSize);

        var actualHash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Iterations,
            HashAlgorithmName.SHA256,
            HashSize);

        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }
}
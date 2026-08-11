using FluentAssertions;
using SteamAdminPanel.Application.Services;
using Xunit;

namespace SteamAdminPanel.Application.Tests;

public sealed class GameTitleNormalizerTests
{
    [Theory]
    [InlineData("Sekiro: Shadows Die Twice - GOTY Edition", "sekiro shadows die twice goty edition")]
    [InlineData("  THE ELDER SCROLLS V: SKYRIM™ ", "the elder scrolls v skyrim")]
    [InlineData("Counter-Strike: Global Offensive", "counter strike global offensive")]
    [InlineData("DON'T STARVE ®", "don t starve")]
    [InlineData("Portal 2", "portal 2")]
    public void Normalize_StripsPunctuationAndCase(string input, string expected)
    {
        GameTitleNormalizer.Normalize(input).Should().Be(expected);
    }

    [Fact]
    public void Normalize_CollapsesInnerWhitespace()
    {
        GameTitleNormalizer.Normalize("A   Very     Long   Title").Should().Be("a very long title");
    }

    [Fact]
    public void HashId_IsDeterministicAndStable()
    {
        var normalized = GameTitleNormalizer.Normalize("Counter-Strike 2");
        GameTitleNormalizer.HashId(normalized).Should()
            .Be(GameTitleNormalizer.HashId(normalized));
        GameTitleNormalizer.HashId(normalized).Should().HaveLength(32);
    }

    [Fact]
    public void HashId_WithNames_DifferentCaseFoldsToSameHash()
    {
        var a = GameTitleNormalizer.HashId(GameTitleNormalizer.Normalize("Dota 2"));
        var b = GameTitleNormalizer.HashId(GameTitleNormalizer.Normalize("DOTA 2"));
        a.Should().Be(b);
        a.Should().HaveLength(32);
    }
}
namespace SteamAdminPanel.Application.Ports;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation,
        CancellationToken cancellationToken = default);
}
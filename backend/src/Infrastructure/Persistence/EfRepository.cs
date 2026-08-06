using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using SteamAdminPanel.Application.Ports;

namespace SteamAdminPanel.Infrastructure.Persistence;

public sealed class EfRepository<TEntity> : IRepository<TEntity>
    where TEntity : class
{
    private readonly AppDbContext _dbContext;

    public EfRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<TEntity?> GetByIdAsync(object id, CancellationToken cancellationToken)
    {
        return _dbContext.Set<TEntity>().FindAsync([id], cancellationToken).AsTask();
    }

    public Task<TEntity?> FirstOrDefaultAsync(Expression<Func<TEntity, bool>> predicate,
        CancellationToken cancellationToken)
    {
        return _dbContext.Set<TEntity>().FirstOrDefaultAsync(predicate, cancellationToken);
    }

    public async Task<IReadOnlyList<TEntity>> ListAsync(Expression<Func<TEntity, bool>>? predicate,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Set<TEntity>().AsNoTracking();
        if (predicate is not null)
        {
            query = query.Where(predicate);
        }

        return await query.ToListAsync(cancellationToken);
    }

    public Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken)
    {
        return _dbContext.Set<TEntity>().AnyAsync(predicate, cancellationToken);
    }

    public Task<int> CountAsync(Expression<Func<TEntity, bool>>? predicate,
        CancellationToken cancellationToken)
    {
        return predicate is null
            ? _dbContext.Set<TEntity>().CountAsync(cancellationToken)
            : _dbContext.Set<TEntity>().CountAsync(predicate, cancellationToken);
    }

    public void Add(TEntity entity)
    {
        _dbContext.Set<TEntity>().Add(entity);
    }

    public void AddRange(IEnumerable<TEntity> entities)
    {
        _dbContext.Set<TEntity>().AddRange(entities);
    }

    public void Update(TEntity entity)
    {
        _dbContext.Set<TEntity>().Update(entity);
    }

    public void Remove(TEntity entity)
    {
        _dbContext.Set<TEntity>().Remove(entity);
    }
}
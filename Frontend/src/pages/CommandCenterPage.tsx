import { useEffect, useState } from 'react'

export default function CommandCenterPage() {
  const [timeStr, setTimeStr] = useState('15:21:03')
  const [dateStr, setDateStr] = useState('2026.08.18')

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const mins = String(now.getMinutes()).padStart(2, '0')
      const secs = String(now.getSeconds()).padStart(2, '0')
      setTimeStr(`${hours}:${mins}:${secs}`)
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      setDateStr(`${year}.${month}.${day}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative flex h-[calc(100vh-5rem)] w-full flex-col overflow-hidden bg-[#070b14] p-3 text-slate-100 select-none">
      {/* Top Bar Header */}
      <header className="flex items-center justify-between border-b border-blue-900/40 pb-2 px-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-black tracking-wider text-xl italic bg-gradient-to-r from-orange-500 via-amber-400 to-primary-400 bg-clip-text text-transparent">
            <span>STEAM</span>
            <span className="text-xs font-normal not-italic text-slate-400 tracking-normal border-l border-slate-700 pl-2">
              Clan Operations / Командный центр
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase tracking-widest text-[10px]">ВРЕМЯ</span>
            <span className="font-mono font-bold text-primary-400">{timeStr}</span>
            <span className="font-mono text-slate-400">{dateStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-warning-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              <circle cx="12" cy="12" r="4" />
            </svg>
            <span className="font-bold text-white">32°C</span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-950/60 border border-blue-800/50 px-2 py-0.5 rounded text-[11px]">
            <span className="text-slate-400">СЕТЬ</span>
            <span className="font-bold text-success-400">99.9%</span>
          </div>
        </div>
      </header>

      {/* Main Grid Layout (Left Panel, Center Globe, Right Panel) */}
      <div className="mt-3 grid flex-1 grid-cols-12 gap-3 min-h-0">
        
        {/* Left Column (Stats & Distribution) */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          
          {/* Panel 1: Personnel Statistics */}
          <div className="relative rounded-xl border border-blue-900/60 bg-blue-950/20 p-3.5 backdrop-blur-md shadow-lg">
            <div className="absolute top-0 left-0 h-2 w-2 border-t-2 border-l-2 border-primary-400" />
            <div className="absolute top-0 right-0 h-2 w-2 border-t-2 border-r-2 border-primary-400" />
            <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-primary-400" />
            <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-primary-400" />

            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-400 animate-pulse" />
                Статистика личного состава
              </h3>
              <span className="text-[10px] text-slate-500">Обзор / Статус</span>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 text-xs border-b border-blue-950 pb-2.5">
              <div>
                <div className="text-[10px] text-slate-400">Всего участников</div>
                <div className="text-lg font-black text-white font-mono tracking-tight">48,304</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Активных в сети</div>
                <div className="text-lg font-black text-success-400 font-mono tracking-tight">43,855</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Ранги и роли</span>
                  <span className="font-mono text-primary-400">89.5%</span>
                </div>
                <div className="h-2 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/50">
                  <div className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full" style={{ width: '89.5%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Сессии Steam</span>
                  <span className="font-mono text-success-400">76.2%</span>
                </div>
                <div className="h-2 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/50">
                  <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" style={{ width: '76.2%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Готовность клана</span>
                  <span className="font-mono text-amber-400">94.8%</span>
                </div>
                <div className="h-2 w-full bg-blue-950 rounded-full overflow-hidden border border-blue-900/50">
                  <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full" style={{ width: '94.8%' }} />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-blue-950/60 pt-2">
              <span>0004</span>
              <span>15998</span>
              <span>31997</span>
              <span>47996</span>
              <span>63994</span>
              <span>79993</span>
            </div>
          </div>

          {/* Panel 2: Data Distribution (Donut / Circular Meters) */}
          <div className="relative flex-1 rounded-xl border border-blue-900/60 bg-blue-950/20 p-3.5 backdrop-blur-md shadow-lg flex flex-col justify-between">
            <div className="absolute top-0 left-0 h-2 w-2 border-t-2 border-l-2 border-primary-400" />
            <div className="absolute top-0 right-0 h-2 w-2 border-t-2 border-r-2 border-primary-400" />
            <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-primary-400" />
            <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-primary-400" />

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
                Распределение данных
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              {/* Ring 1 */}
              <div className="flex flex-col items-center">
                <div className="relative h-20 w-20 flex items-center justify-center">
                  <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#1e3a8a" strokeWidth="6" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#34d399" strokeWidth="6" strokeDasharray="201" strokeDashoffset="40" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-black text-white">43,855</span>
                    <span className="text-[9px] text-slate-400">Всего</span>
                  </div>
                </div>
              </div>

              {/* Stats right of ring 1 */}
              <div className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex justify-between border-b border-blue-950 pb-1">
                  <span className="text-slate-400">Группа A</span>
                  <span className="font-mono font-bold text-white">25,635</span>
                </div>
                <div className="flex justify-between border-b border-blue-950 pb-1">
                  <span className="text-slate-400">Группа Б</span>
                  <span className="font-mono font-bold text-white">15,740</span>
                </div>
                <div className="flex justify-between pb-0.5">
                  <span className="text-slate-400">Аномалии</span>
                  <span className="font-mono font-bold text-amber-400">890</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center border-t border-blue-950 pt-2 mt-2">
              {/* Ring 2 */}
              <div className="flex flex-col items-center">
                <div className="relative h-16 w-16 flex items-center justify-center">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#1e3a8a" strokeWidth="6" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#60a5fa" strokeWidth="6" strokeDasharray="201" strokeDashoffset="90" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-black text-white">19,740</span>
                    <span className="text-[9px] text-slate-400">Актив</span>
                  </div>
                </div>
              </div>

              {/* Stats right of ring 2 */}
              <div className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex justify-between border-b border-blue-950 pb-1">
                  <span className="text-slate-400">Узел 1</span>
                  <span className="font-mono font-bold text-white">11,483</span>
                </div>
                <div className="flex justify-between pb-0.5">
                  <span className="text-slate-400">Узел 2</span>
                  <span className="font-mono font-bold text-white">2,062</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: 3D Globe Visualization with Floating Tooltips */}
        <div className="col-span-6 relative rounded-xl border border-blue-900/60 bg-[#040812] overflow-hidden flex flex-col items-center justify-center p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)] pointer-events-none" />
          
          {/* Globe Graphic Simulation */}
          <div className="relative h-[340px] w-[340px] rounded-full border border-blue-700/40 bg-gradient-to-br from-blue-900/30 via-slate-900 to-black shadow-[0_0_60px_rgba(30,58,138,0.5)] flex items-center justify-center animate-spin [animation-duration:120s]">
            {/* Latitude / Longitude arcs */}
            <div className="absolute inset-2 rounded-full border border-dashed border-blue-500/20" />
            <div className="absolute inset-12 rounded-full border border-blue-400/20" />
            <div className="absolute h-full w-[1px] bg-blue-500/30" />
            <div className="absolute w-full h-[1px] bg-blue-500/30" />
            
            {/* Center landmass abstraction */}
            <div className="absolute h-48 w-48 rounded-full bg-blue-950/60 blur-md" />
            <div className="absolute h-32 w-32 rounded-full bg-slate-800/50 blur-sm top-12 left-16" />
          </div>

          {/* Floating Tooltips / Markers around the globe */}
          <div className="absolute top-16 left-12 rounded border border-blue-500/50 bg-blue-950/80 px-2.5 py-1 text-[10px] text-blue-200 shadow-glow backdrop-blur">
            📍 Узел Москва (Moscow Node)
          </div>
          <div className="absolute top-24 right-16 rounded border border-success-500/50 bg-emerald-950/80 px-2.5 py-1 text-[10px] text-emerald-200 shadow-glow backdrop-blur">
            🛰️ APAC Хаб (APAC Hub)
          </div>
          <div className="absolute bottom-20 left-20 rounded border border-amber-500/50 bg-amber-950/80 px-2.5 py-1 text-[10px] text-amber-200 shadow-glow backdrop-blur">
            ⚡ Шлюз Дубай (Dubai Gateway)
          </div>
          <div className="absolute bottom-28 right-24 rounded border border-primary-400/50 bg-blue-950/80 px-2.5 py-1 text-[10px] text-white shadow-glow backdrop-blur">
            🌐 Регион Токио (Tokyo Region)
          </div>

          <div className="absolute bottom-3 left-4 text-[10px] font-mono text-slate-500">
            LAT: 55.7558 N · LON: 37.6173 E · STATUS: SYNCHRONIZED
          </div>
          <div className="absolute bottom-3 right-4 text-[10px] font-mono text-primary-400">
            STEAM CLAN COMMAND DISPLAY
          </div>
        </div>

        {/* Right Column (Charts & Flight Table) */}
        <div className="col-span-3 flex flex-col gap-3 min-h-0">
          
          {/* Panel 3: Flight/Activity Distribution Bar Chart */}
          <div className="relative rounded-xl border border-blue-900/60 bg-blue-950/20 p-3.5 backdrop-blur-md shadow-lg">
            <div className="absolute top-0 left-0 h-2 w-2 border-t-2 border-l-2 border-primary-400" />
            <div className="absolute top-0 right-0 h-2 w-2 border-t-2 border-r-2 border-primary-400" />
            <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-primary-400" />
            <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-primary-400" />

            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-warning-400" />
                Динамика активности
              </h3>
              <span className="text-[10px] text-slate-400">Пик за день: <strong className="text-white">2,195</strong></span>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-slate-400 mb-2">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-orange-500" /> Игроки</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success-400" /> Сессии</span>
            </div>

            {/* Simulated Dual-Color Bar Chart */}
            <div className="h-28 w-full flex items-end justify-between gap-1 pt-4 border-b border-blue-950">
              {[
                { day: '02', orange: 40, cyan: 20 },
                { day: '03', orange: 60, cyan: 40 },
                { day: '04', orange: 30, cyan: 50 },
                { day: '05', orange: 70, cyan: 30 },
                { day: '06', orange: 50, cyan: 60 },
                { day: '07', orange: 85, cyan: 45 },
                { day: '08', orange: 40, cyan: 75, peak: true },
                { day: '09', orange: 95, cyan: 55 },
                { day: '10', orange: 65, cyan: 40 },
                { day: '11', orange: 50, cyan: 30 },
                { day: '12', orange: 40, cyan: 20 },
              ].map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
                  {item.peak && <span className="text-[9px] font-bold text-orange-400">2195</span>}
                  <div className="w-full flex items-end justify-center gap-0.5 h-20">
                    <div className="w-2 bg-orange-500 rounded-t" style={{ height: `${item.orange}%` }} />
                    <div className="w-2 bg-success-400 rounded-t" style={{ height: `${item.cyan}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-500">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Panel 4: Detailed Flight / Activity Stream Table */}
          <div className="relative flex-1 rounded-xl border border-blue-900/60 bg-blue-950/20 p-3 backdrop-blur-md shadow-lg flex flex-col min-h-0">
            <div className="absolute top-0 left-0 h-2 w-2 border-t-2 border-l-2 border-primary-400" />
            <div className="absolute top-0 right-0 h-2 w-2 border-t-2 border-r-2 border-primary-400" />
            <div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-primary-400" />
            <div className="absolute bottom-0 right-0 h-2 w-2 border-b-2 border-r-2 border-primary-400" />

            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                Журнал активности (Activity Stream)
              </h3>
            </div>

            <div className="grid grid-cols-12 text-[10px] text-slate-400 border-b border-blue-900/60 pb-1 px-1 font-semibold">
              <span className="col-span-3">ДАТА</span>
              <span className="col-span-3">КОД</span>
              <span className="col-span-5">МАРШРУТ / СЕРВЕР</span>
              <span className="col-span-1 text-right">АКТ</span>
            </div>

            <div className="mt-1 flex-1 overflow-y-auto pr-1 flex flex-col gap-1 text-[11px]">
              {[
                { time: '09.03', code: 'SRV-01', route: 'Рейд / Сервер Alpha', qty: 1 },
                { time: '09.04', code: 'SRV-02', route: 'Матч / Сервер Beta', qty: 1 },
                { time: '09.04', code: 'SRV-03', route: 'Турнир / Сервер Gamma', qty: 2 },
                { time: '09.04', code: 'SRV-04', route: 'Тренировка / Сервер Delta', qty: 1 },
                { time: '09.04', code: 'SRV-05', route: 'Событие / Сервер Omega', qty: 1 },
                { time: '09.04', code: 'SRV-01', route: 'Рейд / Сервер Alpha', qty: 2 },
                { time: '09.05', code: 'SRV-02', route: 'Матч / Сервер Beta', qty: 3 },
                { time: '09.05', code: 'SRV-03', route: 'Турнир / Сервер Gamma', qty: 1 },
                { time: '09.05', code: 'SRV-04', route: 'Тренировка / Сервер Delta', qty: 1 },
                { time: '09.05', code: 'SRV-05', route: 'Событие / Сервер Omega', qty: 1 },
              ].map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 items-center rounded px-1 py-1 bg-blue-950/30 hover:bg-blue-900/40 transition-colors font-mono text-[10px]">
                  <span className="col-span-3 text-slate-400">{row.time}</span>
                  <span className="col-span-3 text-primary-300 font-bold">{row.code}</span>
                  <span className="col-span-5 text-slate-200 truncate">{row.route}</span>
                  <span className="col-span-1 text-right text-success-400 font-bold">{row.qty}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Footer Branding */}
      <footer className="mt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-blue-950 pt-1 px-1">
        <div>STEAM CLAN ADMIN CENTER · COMMAND VIEW V2.0</div>
        <div className="tracking-widest font-bold text-slate-400">COMMAND CONTROL</div>
      </footer>
    </div>
  )
}

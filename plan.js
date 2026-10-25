// План дня для утреннего уведомления.
// Этот файл общий: его подключает и страница (index.html), и «помощник» (sw.js),
// поэтому здесь только расчёт — без окон, кнопок и localStorage (помощнику они недоступны).

// Утреннее окно: от заданного времени до полудня (если время позднее — ещё 3 часа после него).
// Позже уведомление не нужно: открыли дашборд вечером — «план на утро» не всплывёт.
function inMorningWindow(time, now = new Date()) {
  const [h, m] = (time || '07:00').split(':').map(Number);
  const cur = now.getHours() * 60 + now.getMinutes(), start = h * 60 + m;
  return cur >= start && cur < Math.max(12 * 60, start + 180);
}

// Заголовок и текст уведомления на дату '2026-10-26'
function morningPlan(state, date) {
  // Если в «Итоге дня» указано другое время — берём его
  const start = e => (e.fact && e.fact.status === 'changed' && e.fact.time) || e.time || '';
  const events = (state.events || []).filter(e => e.date === date).sort((a, b) => start(a).localeCompare(start(b)));
  const open = (state.tasks || []).filter(x => !x.done);
  const dueToday = open.filter(x => x.due === date).length;
  const late = open.filter(x => x.due && x.due < date).length;
  let items = 0;   // невыполненные подшаги учёбы на этот день
  for (const g of state.goals || []) for (const s of g.steps || []) for (const i of s.items || []) if (i.date === date && !i.done) items++;

  const day = new Date(date + 'T00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  const lines = events.length
    ? events.slice(0, 4).map(e => (start(e) ? start(e) + '  ' : '') + e.title)
    : ['В календаре пусто'];
  if (events.length > 4) lines.push('и ещё ' + (events.length - 4));

  const extra = [];
  if (dueToday) extra.push('задач на сегодня: ' + dueToday);
  if (late) extra.push('просрочено: ' + late);
  if (items) extra.push('по учёбе: ' + items);
  if (extra.length) lines.push(extra.join(' · ').replace(/^./, c => c.toUpperCase()));

  return { title: 'План дня · ' + day, body: lines.join('\n') };
}

import { type Team } from '../lib/tournament';

export const generateStandingsImage = (teams: Team[], tournamentName: string): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const SCALE = 2;
    const W = 600;
    const ROW_H = 52;
    const HEADER_H = 90;
    const COL_HEADER_H = 30;
    const FOOTER_H = 44;
    const H = HEADER_H + COL_HEADER_H + teams.length * ROW_H + FOOTER_H;

    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;

    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(null); return; }
    ctx.scale(SCALE, SCALE);

    // Background gradient approximation
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(tournamentName, W / 2, 40);

    ctx.fillStyle = '#a78bfa';
    ctx.font = `13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText('League Standings', W / 2, 62);

    // Thin divider
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 74);
    ctx.lineTo(W - 24, 74);
    ctx.stroke();

    // Column headers
    const colY = HEADER_H + 18;
    ctx.fillStyle = '#64748b';
    ctx.font = `bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('POS', 20, colY);
    ctx.fillText('TEAM', 68, colY);
    ctx.textAlign = 'center';
    ctx.fillText('W', 360, colY);
    ctx.fillText('D', 400, colY);
    ctx.fillText('L', 440, colY);
    ctx.fillText('GD', 488, colY);
    ctx.fillText('PTS', 550, colY);

    // Rows
    const rowStart = HEADER_H + COL_HEADER_H;
    teams.forEach((team, i) => {
      const y = rowStart + i * ROW_H;
      const pos = i + 1;
      const mid = y + ROW_H / 2 + 5;

      // Alternating row bg
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(0, y, W, ROW_H);
      }

      // Position accent stripe
      const stripe = pos === 1 ? '#fbbf24' : pos === 2 ? '#9ca3af' : pos === 3 ? '#d97706' : pos === teams.length ? '#ef4444' : '#334155';
      ctx.fillStyle = stripe;
      ctx.fillRect(0, y, 4, ROW_H);

      // Position number
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(String(pos), 32, mid);

      // Team emoji if set
      if (team.emoji) {
        ctx.font = `14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.fillText(team.emoji, 56, mid);
      }

      // Team name
      ctx.fillStyle = team.color ?? '#e2e8f0';
      ctx.font = `14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = 'left';
      // Truncate long names
      let name = team.name;
      while (ctx.measureText(name).width > 270 && name.length > 3) name = name.slice(0, -1);
      if (name !== team.name) name += '…';
      ctx.fillText(name, team.emoji ? 70 : 68, mid);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#4ade80';
      ctx.font = `13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillText(String(team.won), 360, mid);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(String(team.drawn), 400, mid);
      ctx.fillStyle = '#f87171';
      ctx.fillText(String(team.lost), 440, mid);
      ctx.fillStyle = team.goalDifference > 0 ? '#4ade80' : team.goalDifference < 0 ? '#f87171' : '#94a3b8';
      ctx.fillText((team.goalDifference > 0 ? '+' : '') + team.goalDifference, 488, mid);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillText(String(team.points), 550, mid);

      // Row divider
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + ROW_H);
      ctx.lineTo(W, y + ROW_H);
      ctx.stroke();
    });

    // Footer
    const footerY = rowStart + teams.length * ROW_H;
    ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
    ctx.fillRect(0, footerY, W, FOOTER_H);
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(0, footerY, W, 1);
    ctx.fillStyle = '#a78bfa';
    ctx.font = `11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('dice-league.netlify.app  •  built by Dice-wrld', W / 2, footerY + 27);

    canvas.toBlob(resolve, 'image/png');
  });
};

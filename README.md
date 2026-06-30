# 🏆 Tournament League Table

A customizable league table tracker for your gaming tournaments and competitions!

## ✨ Features

### 📊 Full League Management
- **Live Rankings** - Automatically sorts teams by points, goal difference, and goals scored
- **Detailed Stats** - Tracks played, wins, draws, losses, goals for/against, and points
- **Recent Form** - Shows last 5 match results (W/D/L) with color coding
- **Position Changes** - See which teams are moving up or down with animated indicators

### 🎮 Perfect for Gaming Tournaments
- Works for any competitive game (FIFA, Rocket League, Fortnite, etc.)
- "Goals" can represent points/kills/wins in your game
- Fully customizable team names
- Add/remove teams as needed

### 💾 Persistent Data
- **Auto-Save** - All data is automatically saved in your browser
- **Never Lose Progress** - Close and reopen the page anytime
- **Reset Option** - Start a fresh tournament when ready

### 🎯 Easy to Use
1. **Edit Teams** - Click "Edit Teams" to rename teams or add/remove participants
2. **Add Results** - Click "Add Match Result" and enter the scores
3. **Track Progress** - Watch the table update automatically with rankings and stats
4. **Customize** - Click on the tournament name to change it

## 🎨 Visual Features

- 🥇 **Gold border** for 1st place (Champion)
- 🥈 **Silver border** for 2nd place (Runner-up)
- 🥉 **Bronze border** for 3rd place
- 🔴 **Red border** for last place
- 🟢 **Green badges** for wins
- ⚫ **Gray badges** for draws
- 🔴 **Red badges** for losses
- ⬆️ **Green arrows** for teams moving up
- ⬇️ **Red arrows** for teams moving down

## 📱 Responsive Design

Works perfectly on:
- Desktop computers
- Tablets
- Mobile phones

## 🎲 How to Use for Different Games

### FIFA/Rocket League/Sports Games
- Keep the default setup (goals for/against)
- Add match results with actual scores

### Battle Royale Games (Fortnite, Apex, PUBG)
- Use "Goals For" as elimination points
- Use "Goals Against" as placement points
- Or just use total points scored

### Team Tournaments
- Each team represents a player or squad
- Add results after each match/round
- Perfect for round-robin tournaments

## 🚀 Developer Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
4. Preview the production build:
   ```bash
   npm run preview
   ```

## 🧩 Project Structure

- `src/App.tsx` — main tournament experience and UI
- `src/lib/tournament.ts` — tournament state, persistence, and game logic
- `src/utils/cn.ts` — Tailwind class helper
- `index.html` — application shell
- `package.json` — dependencies and scripts

## 🔄 Tournament Workflow

1. **Setup Phase**
   - Click "Edit Teams"
   - Rename teams to match your participants
   - Add or remove teams as needed
   - Update the tournament name

2. **Playing Phase**
   - After each match, click "Add Match Result"
   - Select the two teams that played
   - Enter their scores
   - Click "Add Result"
   - Watch the table update!

3. **End of Tournament**
   - Review final standings
   - Take screenshots for posterity
   - Click "Reset Tournament" to start fresh

## 💡 Tips

- **Best for 4-20 teams** - Works with any number but these ranges are ideal
- **Regular Updates** - Add results frequently to keep the table exciting
- **Fair Play** - Make sure everyone agrees on the scoring system before starting
- **Screenshot Standings** - Capture memorable moments throughout the tournament

## 🎯 Scoring System

- **Win**: 3 points
- **Draw**: 1 point each
- **Loss**: 0 points

**Tiebreakers (in order)**:
1. Most points
2. Best goal difference
3. Most goals scored
4. Alphabetical order

---

**Made for gamers, by gamers. May the best team win! 🎮🏆**

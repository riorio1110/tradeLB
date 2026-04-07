# 収益確認カレンダー 詳細設計書

## 1. 機能概要

月間カレンダーを表示し、日ごとの損益を色分けで可視化する画面。  
日付をクリックすると、その日のトレード一覧をモーダルで確認できる。

---

## 2. 画面構成

```
┌──────────────────────────────────────────────────┐
│  収益確認カレンダー                                │
│  日別の損益をカレンダー形式で確認                    │
├──────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ 月間損益  │ │ 取引日数  │ │ 月間勝率  │          │
│  │ +¥12,500 │ │   8日    │ │   62%    │          │
│  └──────────┘ └──────────┘ └──────────┘          │
├──────────────────────────────────────────────────┤
│        ◀  2026年 2月  ▶                          │
│  ┌────┬────┬────┬────┬────┬────┬────┐            │
│  │ 日 │ 月 │ 火 │ 水 │ 木 │ 金 │ 土 │            │
│  ├────┼────┼────┼────┼────┼────┼────┤            │
│  │    │    │    │    │    │    │  1 │            │
│  │    │    │    │    │    │    │gray│            │
│  ├────┼────┼────┼────┼────┼────┼────┤            │
│  │  2 │  3 │  4 │  5 │  6 │  7 │  8 │            │
│  │    │+500│    │-200│    │+800│    │            │
│  │    │ 🟢 │    │ 🔴 │    │ 🟢 │    │            │
│  ├────┼────┼────┼────┴────┴────┴────┤            │
│  │ ...│ ...│ ...│    ...           │            │
│  └────┴────┴────┴──────────────────┘            │
└──────────────────────────────────────────────────┘
```

---

## 3. データフロー

```
[Supabase: trades テーブル]
         │
         │ SELECT * FROM trades
         │ WHERE execution_date BETWEEN '月初' AND '月末' -- 追加:月初は画面表示の月初、月末は画面表示の月末
         │   AND deleted_at IS NULL
         ▼
[Server Component: calendar/page.tsx]
    ・Supabase からデータ取得
    ・日付ごとに損益を集計（Map<日付文字列, 損益合計>）
    ・(追加)  月毎の取引日数の計算
    ・(追加)  月間勝率の計算
    ・(追加)  月毎の月間損益の計算
         │
         │ props として渡す
         ▼
[Client Component: CalendarGrid.tsx]
    ・カレンダーグリッドを描画
    ・(追加)日付セル上に緑/赤の丸を表示
    ・月の切り替え（前月/次月）
    ・日付セルのクリックイベント
         │
         │ 日付クリック
         ▼
[Client Component: DayDetailModal.tsx]
    ・選択日のトレード一覧を表示
```

---

## 4. ファイル構成

| ファイルパス | 種別 | 役割 |
|---|---|---|
| `src/app/(protected)/calendar/page.tsx` | Server Component | データ取得・集計・ページ全体の構成 |
| `src/components/CalendarGrid.tsx` | Client Component | カレンダーグリッドUI・月切替・日付クリック |
| `src/components/DayDetailModal.tsx` | Client Component | 日別トレード詳細のモーダル表示 |

---

## 5. コンポーネント詳細設計

### 5.1 calendar/page.tsx（Server Component）

**責務**: データの取得と整形。UI描画はClient Componentに委譲する。

```typescript
// 受け取るもの
searchParams: { year?: string, month?: string }

// Supabaseクエリ
const { data: trades } = await supabase
  .from('trades')
  .select('*')
  .gte('execution_date', '2026-02-01')    // 月初
  .lte('execution_date', '2026-02-28')    // 月末
  .is('deleted_at', null)

// Client Componentに渡すデータ
type CalendarProps = {
  year: number            // 表示年（例: 2026）
  month: number           // 表示月（例: 2, 1始まり）
  dailyPL: DailyPL[]      // 日別の損益集計結果
  trades: Trade[]          // 当月の全トレード（モーダル表示用）
  monthlySummary: {        // 月間サマリー
    totalPL: number
    tradingDays: number
    winRate: number
    winDays: number
    lossDays: number
  }
}

type DailyPL = {
  date: string             // "2026-02-03"
  totalPL: number          // その日の損益合計
  tradeCount: number       // その日の取引件数
}
```

**日別損益の集計ロジック**:  
trades 配列を `execution_date` でグループ化し、各日の `settlement_amount` を合算する。

```typescript
// 集計例
const dailyMap = new Map<string, { totalPL: number, tradeCount: number }>()
trades.forEach(trade => {
  const date = trade.execution_date
  const current = dailyMap.get(date) || { totalPL: 0, tradeCount: 0 }
  current.totalPL += Number(trade.settlement_amount || 0)
  current.tradeCount += 1
  dailyMap.set(date, current)
})
```

---

### 5.2 CalendarGrid.tsx（Client Component）

**責務**: カレンダーの描画、月の切り替え、日付クリックイベントの管理。

#### Props
```typescript
type Props = {
  year: number
  month: number
  dailyPL: DailyPL[]
  trades: Trade[]
  monthlySummary: MonthlySummary
}
```

#### カレンダーグリッドの描画ロジック

1. **当月の日数を取得**: `new Date(year, month, 0).getDate()` → 28〜31
2. **当月1日の曜日を取得**: `new Date(year, month - 1, 1).getDay()` → 0(日)〜6(土)
3. **グリッド配列を生成**: 1日目の前に空セル（前月分）を入れ、7列のグリッドを構成
4. **各日セルの表示**:
   - 損益あり & プラス → 緑系の背景色（`bg-green-900/30`）
   - 損益あり & マイナス → 赤系の背景色（`bg-red-900/30`）
   - 損益なし → デフォルト背景（`bg-zinc-900`）
   - 本日 → ボーダーでハイライト

#### 月の切り替え

`useRouter` の `router.push()` を使って URL の searchParams を変更する。

```
/calendar?year=2026&month=1  →  ◀ 前月
/calendar?year=2026&month=3  →  次月 ▶
```

Server Componentが新しい年月のデータを取得し直すため、ページ全体が再描画される。

#### 日付セルの色分けルール

| 条件 | 背景色 | テキスト色 |
|---|---|---|
| 利益あり（PL > 0） | `bg-green-900/30` | `text-green-400` |
| 損失あり（PL < 0） | `bg-red-900/30` | `text-red-400` |
| 取引なし | `bg-zinc-900` | `text-zinc-500` |
| 本日 | 上記 + `ring-2 ring-indigo-500` | − |
| 当月外の日 | − | `text-zinc-700`（薄く表示） |

---

### 5.3 DayDetailModal.tsx（Client Component）

**責務**: 日付クリック時に、その日のトレード一覧をオーバーレイ表示。

#### Props
```typescript
type Props = {
  isOpen: boolean
  onClose: () => void
  date: string               // "2026-02-03"
  trades: Trade[]             // その日のトレードのみ（フィルタ済み）
  dailyPL: number             // その日の損益合計
}
```

#### 表示内容

```
┌──────────────────────────────────────┐
│  2026年2月3日のトレード       [✕]    │
│  損益合計: +¥500                     │
├──────────────────────────────────────┤
│  銘柄          売買   数量   損益    │
│  トヨタ(7203)   買    100   +¥300   │
│  ソニー(6758)   売     50   +¥200   │
├──────────────────────────────────────┤
│                        [閉じる]     │
└──────────────────────────────────────┘
```

- 背景にオーバーレイ（半透明黒）を表示
- モーダル外クリックまたは✕ボタンで閉じる

---

## 6. URL設計

| URL | 説明 |
|---|---|
| `/calendar` | 今月のカレンダーを表示（year/monthが未指定の場合） |
| `/calendar?year=2026&month=1` | 2026年1月のカレンダーを表示 |

---

## 7. エッジケース

| ケース | 対応 |
|---|---|
| トレードデータが0件の月 | 空のカレンダーを表示 + メッセージ |
| 年またぎ（12月→1月） | year を +1 して month を 1 にする |
| 未来の月へのナビゲーション | 制限なし（空として表示） |
| 同一日に複数トレード | settlement_amount を合算して日別損益とする |

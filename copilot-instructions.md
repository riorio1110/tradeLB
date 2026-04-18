# Copilot Instructions - TradeNote App

## プロジェクト概要

**プロジェクト名**: TradeNote（株管理アプリ）
**目的**: 個人トレーダー向けのトレード結果可視化・管理アプリケーション

### 主機能
- 日々のトレード結果の可視化
- 収益・取引履歴の蓄積
- チャート表示と振り返り
- 将来的な AI による振り返り支援

---

## 技術スタック（確定）

### フロントエンド
- **Next.js 14+**（App Router）+ TypeScript
- **UI フレームワーク**: Tailwind CSS + Headless UI
- **チャート**: TradingView Lightweight Charts

### バックエンド
- **Runtime**: Next.js API Routes（Vercel）
- **用途制限**:
  - 株価データ取得（Yahoo Finance API）
  - AI 連携（OpenAI ChatGPT API）
  - CSV アップロード処理

### データベース・認証
- **Supabase**（PostgreSQL + Auth + RLS）
  - 認証方式: Email + Password
  - Auth ID (UUID) を全テーブルの `user_id` に使用

### デプロイ
- **Vercel**

### 外部サービス
- **株価データ**: TradingView API
- **AI 振り返り**: OpenAI API（ChatGPT）

---

## アーキテクチャ方針

### 基本設計
```
Client Layer (Next.js React + Tailwind)
        ↓ HTTPS (JSON)
Server Layer (Next.js API Routes)
        ↓ DB Access / External API
Supabase (PostgreSQL + Auth + RLS) ←→ External Services


### CRUD 責務分離
- **Supabase 直接操作**: 一般的な CRUD 操作（フロントエンドから）
- **Next.js API Routes**: 以下のみに限定
  - 株価データ取得
  - AI（ChatGPT）連携
  - CSV 変換・一括登録

---

## データベース設計ルール

### 共通カラム（原則全テーブル）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー（自動生成） |
| user_id | UUID | auth.users.id（必須） |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |
| deleted_at | timestamptz | 論理削除フラグ（NULL = 有効） |

### 論理削除ポリシー（重要）
- **物理削除は原則禁止**
- すべてのクエリで `deleted_at IS NULL` 条件を含める
- 理由: トレード履歴・収益データの復元・分析需要、監査性

### Row Level Security（RLS）
- **全テーブルで RLS 有効化**
- ルール: `user_id = auth.uid()` を必須条件とする
- ユーザーは自分のデータのみ可視・操作

---

## テーブル構成

### 1. **trades**（トレード明細）
CSV 1行 = 1レコード

| カラム | 型 | 説明 |
|---------|-----|------|
| id | uuid | PK |
| user_id | uuid | FK（auth.users.id） |
| symbol_code | text | 銘柄コード |
| symbol_name | text | 銘柄名 |
| market | text | 購入元（例：東証） |
| trade_type | text | BUY / SELL |
| term_type | text | 期限（現物 / 信用 / 日計り） |
| custody_type | text | 預り区分 |
| execution_date | date | 約定日 |
| settlement_date | date | 受渡日 |
| quantity | integer | 株数 |
| average_price | numeric | 平均約定単価 |
| fee | numeric | 手数料 |
| tax | numeric | 課税額 |
| settlement_amount | numeric | 受渡金額・決済損益 |
| intraday_amount | numeric | 日計り分受渡金額 |
| source | text | 登録元（csv / manual） |
| created_at | timestamptz | 登録日時 |
| updated_at | timestamptz | 更新日時 |
| deleted_at | timestamptz | 削除日時 |

**設計メモ**:
- 重複制約なし
- 型を enum ではなく text で管理（CSV 差異吸収）

### 2. **trade_comments**（日別トレードコメント）
AI 振り返り拡張の主軸

| カラム | 型 | 説明 |
|---------|-----|------|
| id | uuid | PK |
| user_id | uuid | FK |
| execution_date | date | 対象日 |
| comment | text | 振り返りコメント |
| created_at | timestamptz | 作成日時 |
| updated_at | timestamptz | 更新日時 |
| deleted_at | timestamptz | 削除日時 |

**設計メモ**: 日付×ユーザーで 1レコード想定

### 3. **集計データ**（テーブルなし）
MVP 方針: 日次・月次損益は View またはクエリで算出

```sql
-- 日次損益例
SELECT execution_date, SUM(settlement_amount)
FROM trades
WHERE user_id = :user_id AND deleted_at IS NULL
GROUP BY execution_date;
```

---

## 実装ガイドライン

### コード品質
- **TypeScript**: 全コード TypeScript で実装（any の使用禁止）
- **コメント**: 複雑なロジックのみ、過度なコメントは不要
- **ファイル構成**: App Router の慣例に従う

### Supabase クライアント使用
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

### API Routes（Next.js）
- **エラーハンドリング**: 統一した HTTP ステータス返却
- **認証**: `Authorization: Bearer <JWT>` トークン検証必須
- **CORS**: Vercel 環境での設定を確認

### RLS ポリシー設定
すべてのテーブルで以下を定義:
```sql
-- SELECT
SELECT (auth.uid() = user_id)

-- INSERT / UPDATE
(auth.uid() = user_id)
```

---

## 画面構成（既定）

1. **ログイン画面** - Email + Password
2. **ダッシュボード** - 損益概要、チャート表示
3. **収益確認カレンダー** - 日別損益表示
4. **日別トレード結果表示** - trades テーブル表示
5. **収益登録・更新モーダル** - trades 操作
6. **CSV アップロード画面** - バッチ登録
7. **トレードコメント入力** - trade_comments 操作
8. **チャート表示** - 株価チャート（TradingView）

---

## 開発ワークフロー

### 環境変数（.env.local）
```
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_YAHOO_FINANCE_API_KEY=<key>
OPENAI_API_KEY=<key>
```

### デプロイ
- GitHub リポジトリ → Vercel 自動デプロイ
- 本番環境変数は Vercel ダッシュボード で設定

### テスト
- **単体テスト**: 重要なロジック（CSV 変換等）
- **統合テスト**: API Routes × Supabase
- **E2E テスト**: 画面フロー（ログイン → アップロード → 確認）

---

## 未確定・検討事項（将来決定）

- 株価データ API の最終選定
- AI 振り返りの具体的ユースケース粒度
- データ保持期間（無期限 / 一定期間）
- CSV フォーマット仕様の確定
- パフォーマンス要件（大量件数対応）

---

## 次のステップ（実装順序）

1. **Supabase テーブル定義・RLS ポリシー作成**
2. **ログイン画面実装** - Supabase Auth 連携
3. **ダッシュボード・一覧画面** - 基本 CRUD
4. **CSV アップロード機能** - API Routes
5. **チャート統合** - TradingView
6. **コメント機能** - trade_comments 操作
7. **AI 振り返り機能** - ChatGPT API 連携（後続フェーズ）

---

## 参考リンク・ドキュメント

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/)
- [Tailwind CSS](https://tailwindcss.com/)

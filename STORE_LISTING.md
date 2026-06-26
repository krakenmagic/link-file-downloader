# Chrome Web Store 掲載情報（申請時にコピペ用）

## 公開設定
- 公開範囲: Public（または身内配布なら Unlisted）
- カテゴリ: ツール（Tools / Productivity）
- 言語: 日本語（必要なら英語も追加）
- 価格: 無料

---

## 名称
リンク一括ダウンローダー
（英: Link File Downloader）

## 概要文（短い説明 / 132字以内）
**日本語:**
選択範囲や指定した要素内のリンクから、PDFなどのファイルをまとめてダウンロード。ZIP一括保存にも対応。

**English:**
Batch-download PDFs and other files from links inside a text selection or a picked page element. Supports one-click ZIP.

## 詳細説明（ストア本文）
**日本語:**
```
ページ上のリンクから、PDF・画像・ZIPなどのファイルをまとめてダウンロードできる拡張機能です。

■ 2つの収集方法
・選択範囲から取得 … リンクを含む範囲をドラッグ選択して、その中のリンクだけを収集
・要素を選んで取得 … マウスでブロックをクリックし、その中の全リンクを収集

■ 2つの保存方法
・ZIPでまとめて … 選んだファイルを1つのZIPにまとめて保存（保存ダイアログは1回だけ）
・個別に保存 … 専用サブフォルダへ直接保存

■ 便利な機能
・拡張子フィルタ（例: pdf,zip）で種類を絞り込み
・チェックで保存対象を個別に選択
・相対リンクの自動補完、重複の除去、ファイル名の自動連番

データの外部送信は一切ありません。すべてブラウザ内で完結します。
```

**English:**
```
Download multiple files (PDF, images, ZIP, etc.) from links on any web page.

Two ways to collect links:
- From selection: drag-select a range and collect only the links inside it
- Element picker: click a block to collect all links within it

Two ways to save:
- As ZIP: bundle the selected files into a single ZIP (only one save dialog)
- Individually: save straight into a dedicated subfolder

Extras: extension-type filter (e.g. pdf,zip), per-item checkboxes, automatic
absolute-URL resolution, de-duplication, and filename numbering.

No data is ever sent externally — everything runs locally in your browser.
```

---

## プライバシー関連（申請フォームで入力）
- **プライバシーポリシー URL:** https://krakenmagic.github.io/link-file-downloader/privacy.html
- **データ収集:** なし（「このアイテムはユーザーデータを収集しません」を選択）
- **リモートコード使用:** なし（全コードを同梱、JSZipはローカル）

## 単一目的（Single Purpose）の説明
```
Webページ上のリンクから、ユーザーが選んだファイルをまとめてダウンロードすること。
```

## 権限の利用理由（Permission Justifications）
| 権限 | 申請に書く理由 |
|---|---|
| `downloads` | ユーザーが選択したファイルをブラウザのダウンロード機能で保存するため。 |
| `scripting` | 現在のタブにリンク収集スクリプトと結果パネルUIを注入するため。 |
| `activeTab` | ユーザーがアイコンを押したアクティブなタブに対してのみ処理するため。 |
| `storage` | （将来の設定保存用。未使用なら申請前に manifest から外してもよい） |
| ホスト権限 `<all_urls>` | 「ZIPでまとめて」保存する際、ユーザーが選んだ任意サイトのファイルを取得してZIP化するため。取得物はダウンロード保存以外に利用しない。 |

> 注: `<all_urls>` は審査で理由を問われやすい。指摘された場合は、optional_host_permissions（実行時に都度許可を求める方式）へ変更すると通りやすい。

---

## 提出前チェックリスト
- [ ] アイコン128pxを清書（ストア表示・拡張一覧で使用）
- [ ] スクリーンショット 1280×800 を3〜5枚（収集→パネル→ZIP保存の流れ）
- [ ] manifest の `storage` 権限が未使用なら削除
- [ ] 主要サイトで最終動作確認（PDF一覧 / 画像ギャラリー / ログイン必須）
- [ ] プライバシーポリシーURLが公開されているか確認
- [ ] フォルダをZIP化（.git や開発用ファイルを除外）してアップロード
```
```

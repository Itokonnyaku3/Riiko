# かんたんな テスト

ブラウザを ひらかなくても、Node.js で うごきを たしかめられます。

```bash
node tests/test-map-editor.js && node tests/test-game.js && node tests/test-stage1-map.js
```

- `test-map-editor.js` … マップ作成ツール（じめん・パーツ・けす・もどす・ためしあるき・ファイル出力）
- `test-game.js` … ゲーム本体（マップの よみこみ・あるく・かべ・たからばこ・けん・ハート・やられて再かいし）
- `test-stage1-map.js` … **1面の 地形**（出口まで 行ける／抜け道が ゆいいつの 道／しろへは 行けない／通路の はば）

DOM（ブラウザの しくみ）の ふりを する かんたんな しかけで、`tools/map-editor.js` と
`js/engine.js` を そのまま うごかしています。マップの かたちを 変えたら、ここを 走らせて
こわれていないか たしかめて ください。

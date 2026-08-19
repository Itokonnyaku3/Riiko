# かんたんな テスト

ブラウザを ひらかなくても、Node.js で うごきを たしかめられます。

```bash
node tests/test-map-editor.js && node tests/test-game.js && node tests/test-stage1-map.js && node tests/test-battle.js && node tests/test-save.js && node tests/test-fairy.js && node tests/test-assets.js
```

- `test-map-editor.js` … マップ作成ツール（じめん・パーツ・けす・もどす・ためしあるき・ファイル出力）
- `test-assets.js` … **マップの パーツの 絵**（PNGが そろっている・大きさと 足もとの ばしょ・絵文字への もどり）
- `test-game.js` … ゲーム本体（マップの よみこみ・あるく・かべ・たからばこ・けん・ハート・やられて再かいし）
- `test-stage1-map.js` … **1面の 地形**（出口まで 行ける／抜け道が ゆいいつの 道／しろへは 行けない／通路の はば）
- `test-battle.js` … **たたかいの バランス**（何回で たおせるか・コンボ・ジャスト反げき・突進ネコ）
- `test-save.js` … **面の きりかえ・セーブ・フラグ・チェックポイント・カットシーン・ヒント・くじけない しくみ**
- `test-fairy.js` … **仲間1 妖精ピカ**（加入・ついてくる・しゃべる・ヒント・薬）

DOM（ブラウザの しくみ）の ふりを する かんたんな しかけで、`tools/map-editor.js` と
`js/engine.js` を そのまま うごかしています。マップの かたちを 変えたら、ここを 走らせて
こわれていないか たしかめて ください。

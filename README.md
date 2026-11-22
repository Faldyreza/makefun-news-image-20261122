# makefun-news-image-20261122

[![make.fun · news-image-20261122](https://make.fun/badge/news-image-20261122.svg)](https://make.fun/bounty/news-image-20261122?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122)
[![rank](https://make.fun/badge/news-image-20261122/Faldyreza/makefun-news-image-20261122/rank.svg)](https://make.fun/bounty/news-image-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122)
[![reward](https://make.fun/badge/news-image-20261122/Faldyreza/makefun-news-image-20261122/reward.svg)](https://make.fun/bounty/news-image-20261122?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122)

A program that sums up the world's news of Sunday, 22 November 2026 in one image: a newspaper front page — "THE WORLD" — led by the COP31 climate talks in Antalya heading for no deal, with Iran's strikes on US bases in Bahrain, the Cikande factory fire, and the Kryvyi Rih missile strike below, plus six briefs from Mexico to Mumbai. Every fact was verified live from Reuters, AP and Al Jazeera on 22 November 2026; the sources for each story are listed in `dossier.json`, written beside the image.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB) and `out/dossier.json`. Node 22 standard library only, no network at run time, deterministic — two runs produce byte-identical files.

---

<sub>Entered on [make.fun](https://make.fun/?ref=rvk09evk&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261122) · AI agents build software for cash rewards</sub>

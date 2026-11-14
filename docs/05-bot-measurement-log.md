# Bot Measurement Log

This log records every measurement of the computer players during development, in chronological order, so the development of the bots can be followed. The bots, the method, and the success criteria are described in `docs/03-data-model-and-intelligent-player.md` (sections 3, 4, and 6).

Entries are never rewritten. When a bot changes, a new entry records the new results. Each entry states the code version it measured, so older results remain understandable.

## How to read the results

- **Average position** is the finishing position normalized to the range 0–1: 0 means always first, 1 means always last. Among equal bots the expected value is 0.5.
- **±** is the half width of the 95% confidence interval of the mean. Two results whose intervals overlap clearly are not significantly different.
- **Win rate** counts only matches won alone in first place. Its interval is the 95% Wilson score interval.
- **Seats rotate** from match to match, so no level always starts from the same seat. Seeds are fixed, so every result can be reproduced.
- **Rejected actions** must always be 0: a bot never sends an action the server rejects.

## How to measure

Run the commands from `backend/`. The tournament prints a table and can write every match to a JSON file with `--out`.

```sh
npx tsx tools/simulate/tournament.ts --levels heuristic,rule_based,rule_based,rule_based --games 600 --seed 5000
# Options: --budget <ms> (sampling-bot search time per decision), --playout <actions> (sampling-bot playout length)

npx tsx tools/simulate/tune.ts --games 300 --rounds 2   # tunes the heuristic bot's weights against rule-based bots
```

Template for a new entry:

```md
## <number>. <date> – <short title>

**Code version:** what changed since the previous entry.
**Setup:** levels per seat, number of matches, seed, budget, playout.
**Command:** the exact command.

| Level | Seats | Average position | Win rate (95% CI) | Decision time avg / max |
| --- | ---: | --- | --- | --- |

**Interpretation:** what the result shows and what follows from it.
```

---

## 1. 2026-11-14 – First version of every level

**Code version:** first implementation. The heuristic bot scores hand-size change, follow-up share, reserve cards, attack pressure, Swap and Spy value with hand-picked weights. The sampling bot copies the whole state with `structuredClone` for every simulated action.
**Setup:** heuristic, rule-based, random, random; 200 matches; seed 1.
**Command:** `tournament.ts --levels heuristic,rule_based,random,random --games 200`

| Level | Seats | Average position | Win rate (95% CI) | Decision time avg / max |
| --- | ---: | --- | --- | --- |
| heuristic | 200 | 0.218 ± 0.030 | 44.0% (37.3–50.9%) | 0.02 / 0.8 ms |
| rule-based | 200 | 0.202 ± 0.031 | 49.5% (42.6–56.4%) | 0.02 / 0.8 ms |
| random | 400 | 0.790 ± 0.024 | 3.3% (1.9–5.5%) | 0.01 / 1.2 ms |

Rejected actions: 0. Every match ended with `last_player`; 263.8 actions per match on average.

**Interpretation:** both non-random levels beat the random baseline by far. The random bot draws often, because drawing is always one of its legal actions. The heuristic bot is not better than the rule-based bot.

## 2. 2026-11-14 – Sampling bot, first version

**Code version:** as in entry 1.
**Setup:** one sampling bot against three rule-based bots; 60 matches; seed 1; 30 ms budget; 40-action playouts.
**Command:** `tournament.ts --levels sampling,rule_based,rule_based,rule_based --games 60 --budget 30`

| Level | Seats | Average position | Win rate (95% CI) | Decision time avg / max |
| --- | ---: | --- | --- | --- |
| sampling | 60 | 0.744 ± 0.072 | 5.0% (1.7–13.7%) | 31.1 / 106.2 ms |
| rule-based | 180 | 0.419 ± 0.053 | 31.7% (25.3–38.8%) | 0.02 / 2.8 ms |

**Interpretation:** the sampling bot was much weaker than its own playout policy. The cause was speed, not the method: one iteration (8 candidates × 40 simulated actions) took about 30 ms, so the budget allowed only about one determinization. A decision based on one random sample is close to a random choice among the candidates.

## 3. 2026-11-14 – Faster simulation for the sampling bot

**Code version:** the engine copies the state with `cloneState`, which creates new arrays and player objects but shares the card objects (the engine never changes a card). Playouts build the players' views without copying. A sampling decision now runs a median of 23 iterations in 30 ms instead of about 1 (measured on 113 decisions of 5 matches).
**Setup:** as in entry 2, 80 matches.
**Command:** `tournament.ts --levels sampling,rule_based,rule_based,rule_based --games 80 --budget 30`

| Level | Seats | Average position | Win rate (95% CI) | Decision time avg / max |
| --- | ---: | --- | --- | --- |
| sampling | 80 | 0.583 ± 0.076 | 16.3% (9.7–25.8%) | 22.8 / 38.7 ms |
| rule-based | 240 | 0.472 ± 0.048 | 27.9% (22.6–33.9%) | 0.01 / 1.3 ms |

**Interpretation:** much better than entry 2, but still not better than the rule-based bots.

## 4. 2026-11-14 – Sampling bot with playouts to the end of the match

**Code version:** as in entry 3. Playouts run until the match ends (at most 1000 actions) instead of 40 actions. Measured with a one-off script (the same as the tournament, but with the sampling bot at seat `game mod seats` and seeds from 500); the tournament's `--playout` option now gives the same setup.
**Setup and results:**

| Seats | Matches | Budget | Sampling bot's average position |
| ---: | ---: | --- | --- |
| 4 (against 3 rule-based) | 40 | 150 ms | 0.467 |
| 2 (against 1 rule-based) | 60 | 50 ms | 0.500 |

**Interpretation:** with full playouts the sampling bot is about as strong as the rule-based bot. The samples are too small for a conclusion: the 95% interval is about ±0.1. Larger measurements follow in entry 9.

## 5. 2026-11-14 – Tuning the first heuristic

**Code version:** as in entry 1. `tune.ts` runs a coordinate search: one heuristic bot against three rule-based bots on fixed seeds (1000–1299), and a weight change is kept if it improves the heuristic bot's average position.
**Command:** `tune.ts --games 300 --rounds 2`

| | Average position on the tuning seeds |
| --- | --- |
| Start weights | 0.518 |
| Best weights | 0.501 |

**Interpretation:** tuning the weights alone did not make the heuristic bot better than the rule-based bot. The features themselves had to change.

## 6. 2026-11-14 – Heuristic bot with the "turns needed" feature

**Code version:** new main feature: the number of turns the bot still needs to empty its hand, one per group of number cards with the same number (a whole group is played in one turn as a combo) and one per special card. An unknown card drawn or received counts as 0.8 extra turns. Tuned again with `tune.ts --games 300 --rounds 2`, from 0.517 to 0.459 on the tuning seeds. The tuning set the weights of attack pressure and Spy information to 0. These weights became the defaults.
**Validation on new seeds:** heuristic against three rule-based bots; 600 matches; seed 5000.
**Command:** `tournament.ts --levels heuristic,rule_based,rule_based,rule_based --games 600 --seed 5000`

| Level | Seats | Average position | Win rate (95% CI) | Decision time avg / max |
| --- | ---: | --- | --- | --- |
| heuristic | 600 | 0.491 ± 0.031 | 27.8% (24.4–31.6%) | 0.02 / 1.2 ms |
| rule-based | 1800 | 0.503 ± 0.017 | 24.1% (22.1–26.1%) | 0.02 / 4.1 ms |

Rejected actions: 0.

**Interpretation:** on new seeds the improvement from the tuning (0.459) disappeared; it was mostly fitted to the tuning seeds. The heuristic bot is at most slightly better than the rule-based bot, and the difference is not significant.

## 7. 2026-11-14 – Rule-based and heuristic bots against the random baseline

**Code version:** as in entry 6.
**Setup:** one bot against three random bots; 400 matches each; seed 7000.
**Commands:** `tournament.ts --levels rule_based,random,random,random --games 400 --seed 7000`, and the same with `heuristic`.

| Level | Seats | Average position | Win rate (95% CI) |
| --- | ---: | --- | --- |
| rule-based | 400 | 0.060 ± 0.014 | 83.8% (79.8–87.0%) |
| heuristic | 400 | 0.044 ± 0.012 | 88.3% (84.7–91.0%) |

**Interpretation:** both bots are far better than the random baseline, which meets the success criterion of docs/03 section 6. Against random opponents the heuristic bot is slightly better than the rule-based bot; the intervals overlap a little.

## 8. 2026-11-14 – Heuristic against rule-based, two players

**Code version:** as in entry 6.
**Setup:** heuristic against rule-based; 1000 matches; seed 9000.
**Command:** `tournament.ts --levels heuristic,rule_based --games 1000 --seed 9000`

| Level | Seats | Average position | Win rate (95% CI) |
| --- | ---: | --- | --- |
| heuristic | 1000 | 0.497 ± 0.031 | 50.3% (47.2–53.4%) |
| rule-based | 1000 | 0.503 ± 0.031 | 49.7% (46.6–52.8%) |

**Interpretation:** in direct play the two bots are equally strong.

## 9. 2026-11-14 – Sampling bot, larger measurement

**Code version:** as in entry 6.
**Setup:** one sampling bot against three rule-based bots; 200 matches each; seeds from 500; 100 ms budget; (A) 40-action playouts, (B) playouts to the end of the match. Measured with the one-off script of entry 4, which reports only the average position. With 200 matches the 95% interval is about ±0.05.
**Equivalent command:** `tournament.ts --levels sampling,rule_based,rule_based,rule_based --games 200 --seed 500 --budget 100 --playout 40` (and `--playout 1000`); the seat assignment differs slightly from the script.

| Variant | Matches | Sampling bot's average position |
| --- | ---: | --- |
| A: 40-action playouts, then hand-size ranking | 200 | 0.458 |
| B: playouts to the end of the match | 200 | 0.498 |

**Interpretation:** the shorter playouts are better: they allow more determinizations within the same budget, and the hand-size ranking at the cut-off is a good enough estimate. Variant A is the default (40 actions). It is somewhat better than the rule-based bots, but only at the edge of significance; a larger measurement with the tournament tool should confirm it.

## 10. 2026-11-14 – Inferences from draws, and blocking the next player

**Code version:** goal: separate the levels with a new skill the rule-based bot does not have, instead of further weight tuning (entries 5–6 showed that tuning alone does not generalize).

- The bot memory infers from every draw and pass that the player could not play on the table they saw, and from a drawn +2 penalty that they held no +2 (`HandConstraint`). An inference covers the cards held at that moment and weakens with every card the player plays or gives away; a Spy snapshot replaces it.
- New heuristic feature `block`: the probability that the next player cannot follow the new top card, estimated from the unseen cards, their known cards, and their inferences, times the cards they would draw, scaled by how close they are to finishing. The bot thus closes a color on purpose.
- The sampling bot deals the hidden cards so that they respect the inferences.

**Setup and command:** as in entry 6 (heuristic against three rule-based bots, 600 matches, seed 5000), `block` weight 4.

| Level | Seats | Average position | Win rate (95% CI) | Decision time avg / max |
| --- | ---: | --- | --- | --- |
| heuristic | 600 | 0.445 ± 0.029 | 29.0% (25.5–32.8%) | 0.07 / 3.2 ms |
| rule-based | 1800 | 0.518 ± 0.017 | 23.7% (21.8–25.7%) | 0.01 / 1.3 ms |

**Choosing the weight:** with a one-off script (one heuristic bot at seat `game mod 4` against three rule-based bots):

| `block` | Seeds 1000–1399 (400 matches) | Seeds 20000–20999 (1000 matches, ± 0.023) |
| ---: | --- | --- |
| 2 | 0.469 | |
| 4 | 0.478 | 0.461 |
| 8 | 0.465 | |
| 12 | 0.457 | 0.469 |
| 20 | 0.452 | |
| 30 | 0.426 | 0.471 |
| 50 | 0.436 | |
| 80 | 0.466 | |

With `block` 30 the validation of entry 10's setup gave 0.478 ± 0.029.

**Interpretation:** the feature itself matters, the weight hardly does: every weight from 4 to 30 gives about 0.46 on new seeds. Weight 4 stays the default. The heuristic bot is now significantly stronger than the rule-based bot (the whole interval is below 0.5).

## 11. 2026-11-14 – Sampling bot: cut-off ranking by turns

**Code version:** as in entry 10. New option `cutoff`: when a playout stops, unfinished players are ranked either by the number of cards (`cards`, as before) or by the number of turns they still need to empty their hand (`turns`: one per group of number cards with the same number and one per special card).
**Setup:** one sampling bot against three bots of the same level; 300 matches each; seeds from 500; 100 ms budget; 40-action playouts. Measured with a one-off script (sampling bot at seat `game mod 4`).

| Cut-off | Against 3 rule-based | Against 3 heuristic |
| --- | --- | --- |
| `cards` | 0.443 ± 0.040 | 0.482 ± 0.040 |
| `turns` | 0.440 ± 0.039 | 0.434 ± 0.042 |

**Interpretation:** ranking by turns is the better estimate of who finishes first, and with it the sampling bot also beats the stronger heuristic bot. `turns` became the default, and the `cutoff` option with the `cards` variant was later removed from the code, because it is not used.

## 12. 2026-11-14 – Longer thinking time for the sampling bot

**Code version:** as in entry 11, with the default search time raised from 250 ms to 400 ms per decision (`BOT_SAMPLING_BUDGET_MS`) and the iteration cap from 200 to 1000, so the longer time is not cut off by the cap.
**Setup:** one sampling bot against three heuristic bots; 300 matches; the same seeds as entry 11 (500–799), so the two results are directly comparable; `turns` cut-off; 40-action playouts. Run with the one-off script as four parallel parts of 75 matches. The four processes shared the processor, so the effective search per decision was somewhat smaller than on an idle machine.

| Budget | Against 3 heuristic |
| --- | --- |
| 100 ms (entry 11) | 0.434 ± 0.042 |
| 400 ms | 0.383 ± 0.042 |

The four parts gave 0.400, 0.373, 0.347, and 0.413.

**Interpretation:** more thinking time makes the sampling bot clearly stronger: on the same deals its average position improved by 0.05, and the whole interval is now well below 0.5. The search is not saturated yet at 100 ms, so the strength of the sampling bot can be tuned with the budget. The cost is that one decision blocks the server for up to about 0.4 s.

## 13. 2026-11-14 – A plainer level-2 bot

**Code version:** goal: a larger gap between level 2 and level 3. The rule-based bot was also the playout policy of the sampling bot, so the two were separated: the fuller rule list (`chooseByRules`) stays the playout policy, and level 2 follows a plainer rule list (`chooseBySimpleRules`): it still answers a +2 penalty with a +2 and keeps its special cards for later, but it plays the first playable number card alone, never as a combo, and it does not attack opponents close to finishing.
**Choosing the variant:** a one-off script, one bot at seat `game mod 4`, 1000 matches each; seeds 30000 (against random) and 40000 (heuristic against the variant).

| Level-2 variant | Against 3 random | Heuristic against 3 of the variant |
| --- | --- | --- |
| Fuller rules (until now) | 0.056 ± 0.008 | 0.494 ± 0.022 |
| First playable number with its whole group | 0.050 ± 0.008 | 0.458 ± 0.022 |
| First playable number alone, no combos | 0.092 ± 0.012 | 0.320 ± 0.020 |

**Validation of the chosen variant (no combos) with the tournament tool on new seeds:**

`tournament.ts --levels heuristic,rule_based,rule_based,rule_based --games 1000 --seed 50000`

| Level | Seats | Average position | Win rate (95% CI) |
| --- | ---: | --- | --- |
| heuristic | 1000 | 0.299 ± 0.021 | 46.8% (43.7–49.9%) |
| rule-based | 3000 | 0.567 ± 0.013 | 17.7% (16.4–19.1%) |

`tournament.ts --levels rule_based,random,random,random --games 1000 --seed 60000`

| Level | Seats | Average position | Win rate (95% CI) |
| --- | ---: | --- | --- |
| rule-based | 1000 | 0.096 ± 0.011 | 75.8% (73.0–78.4%) |

Rejected actions: 0.

**Interpretation:** combos are the most valuable skill of the game: without them level 2 is still far stronger than the random baseline, but the heuristic bot now wins almost half of its four-player matches against it (25% would be equal strength). The fuller rules showed again that the old level 2 was nearly as strong as the heuristic bot (0.494 on these seeds). The sampling bot is unaffected, because its playouts still use the fuller rules.

## 14. 2026-11-14 – Sampling bot: successive halving (no improvement)

**Code version:** new option `halvingRound` (removed after this entry): every candidate still in the race is evaluated on every determinization (common random numbers are kept), and after every `halvingRound` iterations the weaker half is dropped, down to two, so the remaining search goes to the close decisions. New option `maxPlayouts`: limits the search by the number of playouts instead of by time.

**First attempt, limited by time:** 100 ms budget, against three heuristic bots, 300 matches, seeds 500–799, nine processes in parallel.

| Variant | Average position |
| --- | --- |
| uniform, 8 candidates (current) | 0.491 ± 0.042 |
| halving every 6 iterations, 8 candidates | 0.517 ± 0.040 |
| halving every 6 iterations, 12 candidates | 0.541 ± 0.040 |

The uniform variant had reached 0.434 with the same seeds and budget in entry 11 (four processes): with nine processes sharing the processor, each decision got much less search. **A time-limited bot cannot be measured fairly with many processes in parallel**, which led to the playout limit.

**Second attempt, limited by playouts:** exactly 480 playouts per decision (about 60 uniform iterations of 8 candidates), so every variant gets the same search regardless of the load; otherwise the same setup.

| Variant | Average position |
| --- | --- |
| uniform, 8 candidates (current) | 0.449 ± 0.041 |
| halving every 6 iterations, 8 candidates | 0.468 ± 0.042 |
| halving every 15 iterations, 8 candidates | 0.480 ± 0.041 |
| halving every 15 iterations, 12 candidates | 0.470 ± 0.042 |

**Interpretation:** successive halving does not help; the uniform allocation was the best in every comparison, although the differences are within the noise. One playout's outcome varies a lot, so a few samples are not enough to drop a candidate safely, and the best candidates are usually so close that extra samples on them change little. Uniform allocation stays, and the halving option was removed from the code afterwards, because it is not used. The tournament tool got the `--max-playouts` option, so sampling-bot measurements can be repeated exactly and run in parallel. Entry 12 showed that more search per decision helps, so faster simulation or a search on a worker thread (more playouts in the same time) are the more promising next steps.

---

## 15. 2026-11-14 – Faster simulation, and where more search stops helping

**Code version:** the legal-action enumeration computes the legal cards once and builds the combos without copying arrays; the fuller playout rules sort the actions by card kind once; the sampling bot builds the set of unseen cards once per decision instead of once per determinization. The rules did not change, and the test that the engine accepts every listed action still passes.

**Speed** (one process on an idle machine, 103 decisions of 6 matches, 480 playouts each):

| Code | Time per playout |
| --- | --- |
| before | 289 µs |
| after | about 185 µs (179–189 µs in three runs) |

The simulation is about 1.55 times faster: 400 ms now hold about 2160 playouts instead of about 1380.

**Strength at a fixed number of playouts** (independent of the load): one sampling bot against three heuristic bots, 300 matches, seeds 500–799, measured with a one-off script (sampling bot at seat `game mod 4`).

| Playouts per decision | Average position |
| --- | --- |
| 480 (entry 14) | 0.449 ± 0.041 |
| 1380 (400 ms with the old code) | 0.381 ± 0.040 |
| 2160 (400 ms with the new code) | 0.406 ± 0.040 |
| 2700 (500 ms with the new code) | 0.400 ± 0.040 |

**Interpretation:** more search helps up to about 1400 playouts per decision, then the strength levels off; 1380, 2160, and 2700 are equal within the noise, so the budget stays at 400 ms. With the 400 ms budget the speed-up therefore does not make the bot stronger, but it reaches the same strength in less time, which also keeps it strong on a slower server. A stronger sampling bot needs better samples or a better evaluation, not more of the same search.

## 16. 2026-11-14 – Blocking in the playouts (no improvement)

**Code version:** experimental option: in the playouts, every player also blocks, ending a combo on a card the next player cannot follow and choosing a Color Change color they cannot follow. Inside a determinization every hand is known, so the playout players see the next player's hand.
**Setup:** 480 playouts per decision, otherwise as in entry 15.

| Playout policy | Average position |
| --- | --- |
| fuller rules (current) | 0.449 ± 0.041 |
| fuller rules with blocking | 0.480 ± 0.042 |

**Interpretation:** worse, though within the noise. Because the playout players see the next hand exactly, they block far more often than real opponents, who can only estimate it, so the simulated futures are too pessimistic. The option was removed from the code.

## 17. 2026-11-14 – Search in worker threads

**Code version:** in live matches the sampling bot searches in a pool of worker threads (`BOT_SAMPLING_WORKERS`, 2 by default). The worker gets a copy of the bot's view and memory and a seed from the bot's own generator. Tests and the simulator search on the calling thread, so the measurements above are not affected.
**Setup:** 10 decisions of a sampling bot from a real match, 400 ms budget each, run one after the other; the delay of the server thread's event loop was measured with `monitorEventLoopDelay`.

| Where the search runs | Longest stall of the server thread |
| --- | --- |
| server thread | 418 ms |
| worker thread | 20 ms |

**Interpretation:** with workers, a sampling bot no longer holds up the other rooms while it thinks; the budget could be raised without affecting other players, although entry 15 shows that more search would not make the bot stronger.

## 18. 2026-11-14 – A slightly weaker level 3, for even steps

**Code version:** goal: steps of about equal size. Until now the step from level 2 to level 3 was about twice as large as the step from level 3 to level 4 (average positions 0.299 and about 0.40). The sampling bot pre-selects its candidates with the heuristic weights, so level 3 got its own weights (`LEVEL_3_WEIGHTS`) and the pre-selection keeps the full ones.

**Choosing the weakening:** heuristic bot against three level-2 bots, 1000 matches each, seeds from 50000, with a one-off script (heuristic bot at seat `game mod 4`):

| Level-3 variant | Against 3 level-2 bots |
| --- | --- |
| full weights, `block` 4 (until now) | 0.308 ± 0.021 |
| `block` 2 | 0.315 ± 0.021 |
| `block` 1 | 0.312 ± 0.021 |
| A: `block` 0, no blocking | 0.339 ± 0.022 |
| B: no blocking, `followUp` 0 | 0.370 ± 0.023 |
| no blocking, `reserve` 0 | 0.400 ± 0.023 |
| no blocking, `reserve` and `followUp` 0 | 0.435 ± 0.023 |

Most of the step from level 2 to level 3 comes from combos, which level 2 never plays, so removing blocking alone weakens level 3 only a little.

**The step above:** one sampling bot (flat search, 1380 playouts per decision) against three bots of variant A or B; 300 matches each, seeds 500–799.

| Level 3 | Sampling bot against 3 of them |
| --- | --- |
| full weights (entry 15) | 0.381 ± 0.040 |
| A | 0.358 ± 0.038 |
| B | 0.372 ± 0.036 |

**Choice:** variant A. It is the smaller weakening, and with it both upper steps are about 0.14–0.16 away from 0.5. It also gives the levels clear roles: level 3 weighs its own hand, and the inferences about the opponents' hands are the advantage of level 4.

**Validation on new seeds with the tournament tool:** `tournament.ts --levels heuristic,rule_based,rule_based,rule_based --games 1000 --seed 70000`

| Level | Seats | Average position | Win rate (95% CI) |
| --- | ---: | --- | --- |
| heuristic (variant A) | 1000 | 0.361 ± 0.022 | 38.4% (35.4–41.5%) |
| rule-based | 3000 | 0.546 ± 0.013 | 20.5% (19.1–22.0%) |

Rejected actions: 0.

## 19. 2026-11-14 – ISMCTS against the flat search (no improvement)

**Code version:** new search option for the sampling bot, `search: "ismcts"` (`backend/src/bots/ismcts.ts`): single-observer Information Set Monte Carlo Tree Search for several players. One tree for the bot's information set; every iteration draws a new determinization, walks down the tree using only the actions legal in it (UCB1 with availability counts, exploration constant 0.7), adds one node, and finishes with the same 40-action playout as the flat search. Every node stores the result of the player who chose its action, so the opponents' replies are searched too. Actions are identified by the signatures of their cards, because sampled hands have different card IDs. At the root the candidates are the same 8 pre-selected actions as in the flat search, and the most visited one is played. With the same number of playouts an ISMCTS decision took about 1.75 times as long as a flat one (330 ms and 188 ms for 1380 playouts), because walking the tree also costs engine steps.
**Setup:** one sampling bot against three heuristic bots with the full weights (as in entry 15, before entry 18), 300 matches, seeds 500–799, one-off script.

| Search | Playouts per decision | Average position |
| --- | --- | --- |
| flat (entry 15) | 1380 | 0.381 ± 0.040 |
| ISMCTS, same playouts | 1380 | 0.427 ± 0.040 |
| ISMCTS, same time | 790 | 0.423 ± 0.040 |

**Interpretation:** ISMCTS is weaker than the flat search here, by about 0.04–0.05, at the edge of significance. The most likely reason is the variance: the flat search compares every candidate on the same determinization with the same random seed, so its comparisons are paired, while ISMCTS evaluates one branch per iteration on a new determinization. With about a thousand iterations and many legal actions per turn, the tree also stays shallow, so searching the opponents' replies does not pay off. In a game with this much luck, the paired comparison of the flat search is worth more than the deeper search. The flat search stays, and the ISMCTS code was removed afterwards, because it is not used; this entry describes it.

---

## Summary so far

- Every level plays without a rejected action, and every decision fits easily within the turn timer.
- The rule-based, heuristic, and sampling bots are all far stronger than the random baseline.
- The levels are now ordered, each one measured against the level below it (0.5 means equal strength):

  | Level | Opponents | Average position |
  | --- | --- | --- |
  | rule-based | 3 random | 0.096 ± 0.011 (entry 13) |
  | heuristic | 3 rule-based | 0.361 ± 0.022 (entry 18) |
  | sampling | 3 heuristic | 0.358 ± 0.038 with 1380 playouts per decision, about 400 ms (entry 18) |

- The game has a lot of luck (deal, draws, Storm values), so the advantage of the sampling bot over the heuristic bot is moderate and needs hundreds of matches to show; the gaps below it are clear.
- What made the difference: not weight tuning, but new knowledge — the inferences from the opponents' draws and blocking the next player.
- More search makes the sampling bot stronger only up to about 1400 playouts per decision (entry 15); successive halving (entry 14) and blocking in the playouts (entry 16) did not help.
- An ISMCTS tree was weaker than the flat search with paired comparisons (entry 19).
- Ideas for later entries: a larger measurement of the sampling bot with the tournament tool, results by player count (2–8), and samples weighted by how well they explain the opponents' moves.

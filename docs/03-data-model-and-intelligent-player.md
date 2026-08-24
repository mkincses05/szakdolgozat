# Core Data Model, Intelligent Player Approach, and Measurement Plan

## 1. Core Data Model

The data model should focus on players, rooms, sessions, turns, cards, and outcomes.

### Main entities

#### Player
- id
- displayName
- connectionState
- handSize
- isBot

#### Room
- id
- hostId
- playerIds
- status
- createdAt

#### GameSession
- id
- roomId
- state
- currentPlayerId
- activeColor
- activePenalty
- startedAt
- endedAt

#### Card
- id
- cardType
- color
- number
- specialEffect

#### TurnAction
- id
- sessionId
- playerId
- actionType
- payload
- createdAt

#### MatchResult
- id
- sessionId
- winnerId
- finalState
- summary

## 2. Intelligent Player Approach

The intelligent player should be designed as a modular decision-making component, not as a hardcoded script.

### Planned approach
- Observe the public game state
- Track visible cards and recent actions
- Determine legal moves first
- Rank available moves by expected usefulness
- Prefer deterministic behavior before adding adaptive logic

### Logic layers
1. **Rule-based layer**
   - Filter legal actions
   - Handle obvious best moves

2. **Heuristic layer**
   - Prefer moves that reduce hand size
   - Consider color continuity and penalty situations
   - Estimate short-term advantage

3. **Adaptive layer**
   - Learn from previous matches
   - Adjust priorities based on opponent behavior
   - Improve over time if runtime learning is enabled

## 3. Measurement Method

The intelligent player should be evaluated with repeatable and comparable metrics.

### Metrics
- Win rate
- Average decision time
- Legal action rate
- Rule violation rate
- Card reduction efficiency
- Consistency across repeated matches

### Measurement setup
- Run the bot against fixed test scenarios
- Compare it with a random baseline
- Compare it with a simple rule-based baseline
- Record results per match and per turn
- Analyze performance under different player counts

## 4. Data Needed for Evaluation
- Match history
- Round outcomes
- Chosen actions
- Available alternatives
- Timing information
- Final results
- Penalty-chain handling outcomes

## 5. Success Criteria

The intelligent player is considered acceptable if it:
- Chooses only legal actions
- Completes decisions within an acceptable time
- Performs better than a random baseline
- Produces stable results across repeated tests
- Handles special cards and penalties correctly

## 6. Open Questions
- Should the bot act as a full player or a helper
- Should it optimize for winning or for realistic play
- Whether learning is allowed during runtime
- Which metrics matter most for the thesis
- Whether the bot should be test-only or playable in the final version
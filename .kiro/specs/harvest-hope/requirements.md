# Requirements Document

## Introduction

Harvest Hope: The Last Farm is a retro 16-bit farming simulation game that addresses India's agricultural crisis through educational gameplay. The system combines classic farming simulation mechanics with AI-powered weather prediction, market simulation, and NPC generation to create an empathetic learning experience about farmer challenges, government schemes, and financial literacy. The game aims to build awareness about the farmer suicide crisis (10,000+ annually in India) while teaching practical solutions through engaging gameplay.

## Glossary

- **Game_System**: The complete Harvest Hope farming simulation application
- **Player**: The user controlling the farming simulation
- **Farm_State**: The current condition of the player's virtual farm including crops, livestock, and resources
- **Season_Cycle**: The 120-day agricultural seasons (Kharif, Rabi, Zaid, Off-season)
- **AI_Weather_Engine**: The AWS Bedrock-powered system that generates realistic monsoon predictions
- **Market_Simulator**: The AI system that calculates crop prices based on supply and demand
- **NPC_Generator**: The AI system that creates farmer characters with unique backstories
- **Government_Schemes**: Real Indian agricultural support programs (PM-KISAN, Fasal Bima, KCC)
- **EMI_System**: The loan and repayment tracking mechanism
- **Property_Based_Tests**: Automated tests that verify game logic correctness across many inputs
- **Game_UI**: The complete user interface system for Harvest Hope
- **Farm_Grid**: The visual 5x5 or 6x6 grid displaying planted crops and empty soil tiles
- **HUD**: The heads-up display showing money, season, day, and weather information
- **Control_Panel**: The side panel containing crop selection, financial summary, and action buttons
- **Retro_Aesthetic**: 16-bit pixel art styling reminiscent of SNES-era games
- **Tile**: Individual grid squares that can contain crops or remain empty soil
- **Press_Start_Font**: The 'Press Start 2P' Google Font used for retro text styling
- **Color_Scheme**: The green (#4af626) on dark background (#1a1a1a) color palette
- **Responsive_Layout**: UI that adapts between desktop side-by-side and mobile stacked layouts

## Requirements

### Requirement 1

**User Story:** As a player, I want to manage a virtual Indian farm through seasonal cycles, so that I can learn about agricultural challenges and decision-making.

#### Acceptance Criteria

1. WHEN the game starts THEN the Game_System SHALL display a 16-bit pixel art farm with configurable crop areas
2. WHEN a season begins THEN the Game_System SHALL provide 120 days for farm management activities
3. WHEN the player plants crops THEN the Game_System SHALL track growth stages from seedling to harvestable
4. WHEN crops reach maturity THEN the Game_System SHALL calculate yield based on weather, soil, and care factors
5. WHEN a season ends THEN the Game_System SHALL advance to the next seasonal cycle

### Requirement 2

**User Story:** As a player, I want realistic weather predictions and daily weather events, so that I can make informed farming decisions like real farmers.

#### Acceptance Criteria

1. WHEN a season starts THEN the AI_Weather_Engine SHALL generate monsoon predictions using historical IMD data patterns
2. WHEN daily weather occurs THEN the Game_System SHALL affect crop growth based on rainfall, temperature, and humidity
3. WHEN extreme weather events happen THEN the Game_System SHALL present realistic farming challenges and response options
4. WHEN drought conditions occur THEN the Game_System SHALL reduce crop yields and increase irrigation costs
5. WHEN flood conditions occur THEN the Game_System SHALL damage crops and create recovery scenarios

### Requirement 3

**User Story:** As a player, I want to experience realistic market economics, so that I can understand price volatility and selling strategies.

#### Acceptance Criteria

1. WHEN crops are ready for sale THEN the Market_Simulator SHALL provide current market prices based on supply and demand
2. WHEN market prices fall below MSP THEN the Game_System SHALL offer government procurement options
3. WHEN the player sells crops THEN the Game_System SHALL calculate revenue and update financial status
4. WHEN market conditions change THEN the Game_System SHALL provide selling advice and timing recommendations
5. WHEN storage options are available THEN the Game_System SHALL allow players to hold crops for better prices

### Requirement 4

**User Story:** As a player, I want to access different types of agricultural loans, so that I can learn about credit options and debt management.

#### Acceptance Criteria

1. WHEN the player needs capital THEN the EMI_System SHALL offer bank KCC loans at 7% interest with collateral requirements
2. WHEN urgent funding is needed THEN the EMI_System SHALL provide moneylender options at 36% interest with instant approval
3. WHEN loans are taken THEN the Game_System SHALL track monthly EMI payments and calculate interest accurately
4. WHEN EMI payments are missed THEN the Game_System SHALL apply penalties and affect credit score
5. WHEN government schemes are available THEN the Game_System SHALL provide PM-KISAN direct payments automatically

### Requirement 5

**User Story:** As a player, I want to interact with AI-generated farmer NPCs, so that I can learn from diverse agricultural experiences and build empathy.

#### Acceptance Criteria

1. WHEN the game generates NPCs THEN the NPC_Generator SHALL create farmers with unique backstories and current crises
2. WHEN interacting with NPCs THEN the Game_System SHALL provide contextual dialogue based on their situations
3. WHEN NPCs face crises THEN the Game_System SHALL present opportunities for player assistance or learning
4. WHEN player choices affect NPCs THEN the Game_System SHALL track relationship changes and story outcomes
5. WHEN NPC stories conclude THEN the Game_System SHALL demonstrate consequences of different intervention approaches

### Requirement 6

**User Story:** As a player, I want to learn about government agricultural schemes, so that I can understand available support systems for farmers.

#### Acceptance Criteria

1. WHEN relevant situations arise THEN the Game_System SHALL present information about applicable Government_Schemes
2. WHEN scheme eligibility is met THEN the Game_System SHALL allow players to apply for benefits like crop insurance
3. WHEN schemes are utilized THEN the Game_System SHALL demonstrate their impact on farm economics
4. WHEN players access scheme information THEN the Game_System SHALL provide accurate details about real programs
5. WHEN educational moments occur THEN the Game_System SHALL explain how schemes address specific farmer challenges

### Requirement 7

**User Story:** As a player, I want engaging retro-style graphics and audio, so that I can enjoy an immersive gaming experience while learning.

#### Acceptance Criteria

1. WHEN the game renders THEN the Game_System SHALL display 16-bit pixel art graphics with authentic retro aesthetics
2. WHEN visual effects are applied THEN the Game_System SHALL provide optional CRT scanline shaders for nostalgic feel
3. WHEN audio plays THEN the Game_System SHALL use 8-bit chiptune music and sound effects
4. WHEN animations occur THEN the Game_System SHALL show smooth crop growth transitions and character movements
5. WHEN UI elements appear THEN the Game_System SHALL maintain consistent pixel art styling throughout

### Requirement 8

**User Story:** As a player, I want random events and decision points, so that I can experience the unpredictability of farming life.

#### Acceptance Criteria

1. WHEN events are generated THEN the Game_System SHALL create realistic scenarios based on current farm and market conditions
2. WHEN events present choices THEN the Game_System SHALL provide multiple response options with clear trade-offs
3. WHEN decisions are made THEN the Game_System SHALL apply consequences that affect future gameplay
4. WHEN critical events occur THEN the Game_System SHALL present educational information about real farmer challenges
5. WHEN event outcomes resolve THEN the Game_System SHALL demonstrate long-term impacts of player choices

### Requirement 9

**User Story:** As a developer, I want comprehensive property-based testing, so that I can ensure game logic correctness across all scenarios.

#### Acceptance Criteria

1. WHEN EMI calculations occur THEN the Property_Based_Tests SHALL verify mathematical accuracy across all loan parameters
2. WHEN crop yields are calculated THEN the Property_Based_Tests SHALL ensure results stay within biological limits
3. WHEN weather predictions are generated THEN the Property_Based_Tests SHALL validate meteorological consistency
4. WHEN market prices are simulated THEN the Property_Based_Tests SHALL confirm economic bounds and MSP relationships
5. WHEN game state changes THEN the Property_Based_Tests SHALL verify data integrity and progression logic

### Requirement 10

**User Story:** As a player, I want my game progress saved and accessible, so that I can continue my farming journey across multiple sessions.

#### Acceptance Criteria

1. WHEN game state changes THEN the Game_System SHALL automatically save progress to persistent storage
2. WHEN the player returns THEN the Game_System SHALL restore the exact farm state and progress
3. WHEN multiple save slots are needed THEN the Game_System SHALL support different farm scenarios
4. WHEN save data is corrupted THEN the Game_System SHALL handle errors gracefully and provide recovery options
5. WHEN cross-device access is desired THEN the Game_System SHALL sync saves through cloud storage

### Requirement 11

**User Story:** As a player, I want to see my farm as a visual grid instead of debug text, so that I can understand my crop layout at a glance.

#### Acceptance Criteria

1. WHEN the game loads THEN the Game_UI SHALL display a 5x5 or 6x6 Farm_Grid with clearly defined tile boundaries
2. WHEN tiles are empty THEN the Game_UI SHALL show brown soil color (#8B4513) or 🟫 emoji representation
3. WHEN crops are planted THEN the Game_UI SHALL display appropriate crop emojis (🌾 rice, 🌾 wheat, ☁️ cotton, 🎋 sugarcane)
4. WHEN hovering over tiles THEN the Game_UI SHALL provide visual feedback with subtle highlighting
5. WHEN clicking on empty tiles THEN the Game_UI SHALL allow crop planting with the currently selected crop type

### Requirement 12

**User Story:** As a player, I want a clean heads-up display showing essential information, so that I can track my progress without information overload.

#### Acceptance Criteria

1. WHEN the game displays the HUD THEN the Game_UI SHALL show money with 💰 icon in format "₹100,000"
2. WHEN displaying season information THEN the Game_UI SHALL show season name and day progress with 📅 icon in format "Kharif (Day 1/120)"
3. WHEN showing weather THEN the Game_UI SHALL display current weather with appropriate emoji (🌧️ rain, ☀️ sun, ☁️ cloud)
4. WHEN the HUD renders THEN the Game_UI SHALL fit all information in a single compact line at the top
5. WHEN screen space is limited THEN the Game_UI SHALL maintain readability by using icons and abbreviated text

### Requirement 13

**User Story:** As a player, I want retro-styled buttons and controls, so that I can enjoy an authentic 16-bit gaming experience.

#### Acceptance Criteria

1. WHEN buttons are displayed THEN the Game_UI SHALL use 2-3px solid borders with lighter shade highlights
2. WHEN buttons are styled THEN the Game_UI SHALL use green background (#4a9a4a) with Press_Start_Font typography
3. WHEN hovering over buttons THEN the Game_UI SHALL increase brightness slightly for visual feedback
4. WHEN clicking buttons THEN the Game_UI SHALL apply pressed effect with transform: translateY(2px)
5. WHEN buttons are sized THEN the Game_UI SHALL ensure minimum 44px height for touch-friendly interaction

### Requirement 14

**User Story:** As a player, I want organized crop selection and game controls, so that I can efficiently manage my farm operations.

#### Acceptance Criteria

1. WHEN the Control_Panel displays THEN the Game_UI SHALL show crop selection buttons for Rice, Wheat, Cotton, and Sugarcane
2. WHEN crop buttons are shown THEN the Game_UI SHALL include appropriate emojis and clear labels
3. WHEN displaying financial information THEN the Game_UI SHALL show current money and debt in a compact summary
4. WHEN action buttons are present THEN the Game_UI SHALL prominently display "Advance Day" button
5. WHEN additional features are available THEN the Game_UI SHALL provide buttons for Weather Forecast and Government Schemes

### Requirement 15

**User Story:** As a player, I want a cohesive retro color scheme and typography, so that the game feels authentic and visually appealing.

#### Acceptance Criteria

1. WHEN the Game_UI renders THEN the Game_UI SHALL use dark background (#1a1a1a) with bright green text (#4af626)
2. WHEN typography is displayed THEN the Game_UI SHALL use Press_Start_Font from Google Fonts for headings and buttons
3. WHEN panels are shown THEN the Game_UI SHALL use darker panel backgrounds (#0a0a0a) with green borders
4. WHEN displaying financial information THEN the Game_UI SHALL use green for positive amounts and red (#ff4444) for negative amounts
5. WHEN soil and crops are rendered THEN the Game_UI SHALL use appropriate colors (brown soil, green rice, gold wheat, white cotton, pale green sugarcane)

### Requirement 16

**User Story:** As a player, I want the interface to work well on both desktop and mobile devices, so that I can play anywhere.

#### Acceptance Criteria

1. WHEN viewed on desktop THEN the Game_UI SHALL display Farm_Grid on the left and Control_Panel on the right in side-by-side layout
2. WHEN viewed on mobile THEN the Game_UI SHALL stack Farm_Grid on top and Control_Panel below
3. WHEN the layout adapts THEN the Game_UI SHALL maintain maximum width of 1200px centered on screen
4. WHEN on mobile devices THEN the Game_UI SHALL ensure buttons remain touch-friendly with adequate spacing
5. WHEN text is displayed THEN the Game_UI SHALL maintain readability with minimum 14px body text and 12px retro headings

### Requirement 17

**User Story:** As a player, I want smooth visual feedback and transitions, so that the interface feels polished and responsive.

#### Acceptance Criteria

1. WHEN UI elements change THEN the Game_UI SHALL apply smooth transitions with "transition: all 0.2s ease"
2. WHEN panels are displayed THEN the Game_UI SHALL add subtle box shadows for visual depth
3. WHEN interactive elements are used THEN the Game_UI SHALL provide immediate visual feedback for all user actions
4. WHEN corners are rendered THEN the Game_UI SHALL use 4-8px rounded corners for panels and buttons
5. WHEN hover states are active THEN the Game_UI SHALL maintain consistent interaction patterns across all elements

### Requirement 18

**User Story:** As a developer, I want the UI redesign to preserve all existing game functionality, so that no features are lost during the visual transformation.

#### Acceptance Criteria

1. WHEN the new UI is implemented THEN the Game_UI SHALL maintain all existing Redux store interactions without modification
2. WHEN game state changes THEN the Game_UI SHALL reflect updates immediately in the visual interface
3. WHEN user actions occur THEN the Game_UI SHALL trigger the same game logic as the previous debug interface
4. WHEN errors occur THEN the Game_UI SHALL handle them gracefully without breaking the visual layout
5. WHEN performance is measured THEN the Game_UI SHALL maintain smooth 60fps rendering with minimal re-renders

### Requirement 19

**User Story:** As a developer, I want clean, maintainable component architecture, so that the UI can be easily extended and modified.

#### Acceptance Criteria

1. WHEN components are created THEN the Game_UI SHALL separate concerns into GameUI, FarmGrid, HUD, and ControlPanel components
2. WHEN styling is applied THEN the Game_UI SHALL use CSS modules or styled-components for scoped styling
3. WHEN components render THEN the Game_UI SHALL use React.memo for FarmGrid to prevent unnecessary re-renders
4. WHEN props are passed THEN the Game_UI SHALL use TypeScript interfaces for type safety
5. WHEN accessibility is considered THEN the Game_UI SHALL include proper ARIA labels and keyboard navigation support

### Requirement 20

**User Story:** As a content creator, I want the interface to be screenshot and video-ready, so that I can create compelling promotional materials.

#### Acceptance Criteria

1. WHEN screenshots are taken THEN the Game_UI SHALL display a cohesive, professional-looking farming game interface
2. WHEN recorded for video THEN the Game_UI SHALL maintain visual consistency and smooth animations
3. WHEN demonstrating features THEN the Game_UI SHALL clearly show game state and available actions
4. WHEN showcasing the retro aesthetic THEN the Game_UI SHALL authentically represent 16-bit era gaming visuals
5. WHEN used for blog posts THEN the Game_UI SHALL provide clear visual examples of farming simulation gameplay
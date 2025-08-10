# Requirements Document

## Introduction

This document outlines the requirements for integrating the existing LiveResearchBot functionality from the WebResearchTool project into the Resource Watch application. The goal is to add a research button/icon to the Resource Watch explore page that opens a chatbot interface, allowing users to perform live web research using the same pipeline as the existing LiveResearchBot (query generation, web research, content analysis, and summarization).

## Requirements

### Requirement 1

**User Story:** As a Resource Watch user, I want to access a research chatbot from the explore page, so that I can perform live web research related to environmental data and topics.

#### Acceptance Criteria

1. WHEN I visit the Resource Watch explore page THEN I SHALL see a research button/icon that is easily accessible
2. WHEN I click the research button THEN the system SHALL open a chatbot interface
3. WHEN the chatbot interface opens THEN it SHALL be visually integrated with the Resource Watch design system
4. WHEN the chatbot is ready THEN it SHALL display a welcome message indicating it's ready for research questions

### Requirement 2

**User Story:** As a Resource Watch user, I want to ask research questions through the chatbot, so that I can get comprehensive answers based on live web research.

#### Acceptance Criteria

1. WHEN I type a research question in the chatbot THEN the system SHALL initiate the live research pipeline
2. WHEN the research pipeline starts THEN the system SHALL show progress indicators for each research phase
3. WHEN research is in progress THEN the system SHALL display status updates (generating queries, searching web, scanning pages, etc.)
4. WHEN research completes THEN the system SHALL display a comprehensive summary with citations and links
5. WHEN I ask follow-up questions THEN the system SHALL provide contextual responses based on the research context

### Requirement 3

**User Story:** As a Resource Watch user, I want the research functionality to work seamlessly with the existing application, so that I can use it without disrupting my current workflow.

#### Acceptance Criteria

1. WHEN I use the research chatbot THEN it SHALL NOT interfere with existing Resource Watch functionality
2. WHEN the chatbot is open THEN I SHALL be able to close it and return to normal explore functionality
3. WHEN I navigate away from the explore page THEN the chatbot SHALL maintain its state if I return
4. WHEN there are connection issues THEN the system SHALL handle errors gracefully and attempt reconnection

### Requirement 4

**User Story:** As a Resource Watch user, I want the research results to be relevant to environmental and sustainability topics, so that the research aligns with Resource Watch's mission.

#### Acceptance Criteria

1. WHEN I ask research questions THEN the system SHALL prioritize environmental and sustainability-related sources
2. WHEN generating search queries THEN the system SHALL include relevant environmental context
3. WHEN scanning web pages THEN the system SHALL focus on content relevant to environmental data and policies
4. WHEN providing summaries THEN the system SHALL highlight connections to environmental topics and data

### Requirement 5

**User Story:** As a developer, I want to reuse existing WebResearchTool components and backend services, so that I can minimize development time and maintain consistency.

#### Acceptance Criteria

1. WHEN implementing the integration THEN the system SHALL reuse the existing LiveResearchChatBot backend from WebApi
2. WHEN creating the frontend interface THEN the system SHALL reuse existing WebApp chatbot components where possible
3. WHEN establishing communication THEN the system SHALL use the existing WebSocket and API patterns from WebResearchTool
4. WHEN handling research pipeline THEN the system SHALL use the existing search, ranking, and scanning agents without modification
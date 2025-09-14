# Services Context

## Overview
External service integrations and API connections for the Descendants metaverse system.

## Core Service

### `supabase.ts` - Real-time Database Integration
**Primary backend service providing:**
- **Real-time Synchronization**: Live multiplayer world updates
- **Data Persistence**: Block placement and world state storage
- **User Authentication**: Secure user sessions and permissions
- **AI Simulant Data**: Simulant state and conversation history storage

## Key Features

### Real-time Collaboration
- **Block Updates**: Instant synchronization of block placement/removal
- **Simulant Tracking**: Live simulant position and status updates
- **Chat System**: Real-time messaging between users and AI simulants
- **Presence Awareness**: Active user tracking and session management

### Data Management
- **World Persistence**: Automatic saving of world state changes
- **Conflict Resolution**: Handles simultaneous edits from multiple users
- **Data Validation**: Server-side validation for world integrity
- **Backup Systems**: Automated world state backups and recovery

### Performance Optimization
- **Selective Subscriptions**: Only subscribe to relevant world regions
- **Batch Updates**: Efficient bulk operations for large changes
- **Connection Management**: Automatic reconnection and error handling
- **Rate Limiting**: Prevents spam and ensures stable performance

## Integration Points
- **World Store**: Direct integration with Zustand state management
- **AI Simulants**: Stores simulant conversations and AI session data
- **Authentication**: User session management and permissions
- **Analytics**: Usage tracking and performance metrics

## Configuration
- **Environment Variables**: Secure API key and URL management
- **Connection Settings**: Configurable timeout and retry settings
- **Security Policies**: Row-level security for data protection
- **Schema Management**: Database schema versioning and migrations

## Usage Patterns
- **Optimistic Updates**: Immediate UI updates with server confirmation
- **Error Handling**: Graceful degradation when offline or connection issues
- **Type Safety**: Full TypeScript integration with generated types
- **Development Tools**: Local development database and testing utilities

## Dependencies
- **@supabase/supabase-js**: Core Supabase client library
- **@supabase/ssr**: Server-side rendering integration
- **Zustand**: State management integration
- **TypeScript**: Generated types for database schema

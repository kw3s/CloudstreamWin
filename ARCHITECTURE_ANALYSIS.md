# CloudStream Architecture Analysis for Windows Port

## Overview
CloudStream is an extension-based multimedia player with a plugin system that allows users to add video sources. The Android app uses Kotlin Multiplatform with Android-specific UI (Jetpack Compose/Fragments) and ExoPlayer for video playback.

## Core Architecture

### 1. **Plugin/Extension System**
- **BasePlugin**: Abstract class that providers extend
- **MainAPI**: Abstract class defining provider interface
- **PluginManager**: Loads plugins from files/online repositories
- Plugins are loaded dynamically and register themselves via `registerMainAPI()`
- Supports both MainAPI (content providers) and ExtractorAPI (video link extractors)

### 2. **Data Models**

#### SearchResponse
- Basic search result: name, url, apiName, type, posterUrl, year, plot, score, quality
- Used for search results and recommendations

#### LoadResponse (TvSeriesLoadResponse, MovieLoadResponse, AnimeLoadResponse)
- Detailed media information
- Contains episodes, actors, trailers, recommendations
- Supports multiple dub statuses (Sub, Dub, Raw)
- Season/episode management

#### Episode
- Episode data: name, url, season, episode number, description
- Supports multiple sources/qualities per episode

### 3. **Key Components**

#### Search Flow
1. User enters search query
2. SearchViewModel queries all registered providers
3. Results aggregated and displayed
4. User clicks result → navigates to Details screen

#### Details Flow
1. ResultViewModel loads detailed info (LoadResponse)
2. Displays poster, plot, actors, trailers
3. Shows episode list (for TV series)
4. User clicks episode → opens video player

#### Video Player
- Uses ExoPlayer (Android Media3)
- Supports subtitles, multiple audio tracks
- Episode navigation within player
- Resume watching functionality
- Download support

### 4. **UI Structure (Android)**
- **MainActivity**: Entry point, navigation setup
- **Fragments**: SearchFragment, ResultFragment, PlayerFragment, etc.
- **ViewModels**: MVVM pattern with LiveData/StateFlow
- **Navigation**: Jetpack Navigation Component
- **RecyclerViews**: For lists (search results, episodes, etc.)

### 5. **Library Structure**
- **commonMain**: Shared Kotlin code (providers, extractors, data models)
- **androidMain**: Android-specific implementations
- **jvmMain**: JVM-specific implementations (for potential desktop use)

## Key Features to Port

1. ✅ Search functionality across multiple providers
2. ✅ Details page with episode list
3. ✅ Video playback with controls
4. ✅ Provider/extension system
5. ✅ Bookmarks/library
6. ✅ Resume watching
7. ⚠️ Subtitles (important but complex)
8. ⚠️ Download functionality (can be added later)

## Technology Recommendations for Windows

### Option 1: **C# with WinUI 3** (Recommended)
**Pros:**
- Native Windows UI framework
- Modern, Fluent Design System
- Excellent media support via MediaPlayerElement
- MVVM pattern support (CommunityToolkit.Mvvm)
- Great performance
- Windows 10/11 native

**Cons:**
- Windows-only (but that's the requirement)
- Learning curve if unfamiliar with C#

**Video Playback:**
- MediaPlayerElement (built-in Windows media player)
- Or VLC.NET/libvlcsharp for advanced features

### Option 2: **C# with WPF**
**Pros:**
- Mature, stable framework
- Excellent tooling
- Rich ecosystem
- MVVM well-established

**Cons:**
- Older technology (though still maintained)
- Less modern UI by default

### Option 3: **C# with Avalonia**
**Pros:**
- Cross-platform (but we'll focus on Windows)
- Modern UI framework
- MVVM support

**Cons:**
- Less Windows-native feel
- Smaller community than WinUI/WPF

## Recommended Approach: **C# WinUI 3**

### Project Structure
```
CloudStream.Windows/
├── CloudStream.Core/          # Shared business logic
│   ├── Models/                # Data models (SearchResponse, LoadResponse, etc.)
│   ├── Providers/             # Provider system (MainAPI abstraction)
│   ├── Extractors/            # Video link extractors
│   └── Services/              # Core services
├── CloudStream.Windows/      # WinUI 3 app
│   ├── Views/                 # XAML pages
│   ├── ViewModels/            # MVVM ViewModels
│   ├── Controls/              # Custom controls
│   └── Services/              # Windows-specific services
└── CloudStream.Plugins/       # Plugin loading system
```

### Key Implementation Points

1. **Provider System**: Port the MainAPI abstract class and plugin loading
2. **Video Player**: Use MediaPlayerElement or VLC.NET
3. **UI**: WinUI 3 Pages with NavigationView
4. **MVVM**: CommunityToolkit.Mvvm for ViewModels
5. **Networking**: HttpClient for API calls
6. **JSON**: System.Text.Json or Newtonsoft.Json

## Migration Strategy

### Phase 1: Core Foundation
- Set up WinUI 3 project
- Port data models (SearchResponse, LoadResponse, Episode)
- Port provider system (MainAPI, BasePlugin)
- Basic plugin loading

### Phase 2: Search & Browse
- Search page with provider selection
- Results display
- Details page with episode list

### Phase 3: Video Playback
- Video player page
- Media controls
- Episode navigation

### Phase 4: Polish
- Bookmarks/library
- Resume watching
- Settings
- Subtitles (if needed)

## Next Steps

1. Create WinUI 3 project structure
2. Port core data models
3. Port provider system
4. Create basic UI (Search → Details → Player)
5. Integrate video player
6. Test with sample provider


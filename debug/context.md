# Debug Context

## Overview
Comprehensive debugging and development tools for the Descendants metaverse system.

## Core Debug Components

### `UnifiedDebugPanel.tsx` - Primary Debug Interface
- **Performance Metrics**: Real-time FPS, memory usage, render statistics
- **System Controls**: Toggle various system features and optimizations
- **Visual Debugging**: Wireframes, bounding boxes, performance overlays
- **State Inspection**: Live world state monitoring and manipulation

### `AdvancedDebugInterface.tsx` - Advanced Developer Tools
- **Deep System Analysis**: Detailed component performance profiling
- **Memory Debugging**: GPU and CPU memory usage tracking
- **Render Pipeline**: Step-by-step rendering process visualization
- **Error Tracking**: Comprehensive error logging and reporting

### `PerformanceBenchmark.tsx` - Performance Testing Suite
- **Automated Benchmarks**: Standardized performance testing scenarios
- **Load Testing**: High block count and simulant stress testing
- **Device Profiling**: Performance characteristics across device types
- **Regression Testing**: Performance comparison across builds

## Specialized Debug Tools

### `YLevelDebugTest.tsx` - Y-Level Positioning Debug
- **Vertical Alignment**: Visual debugging for Y-level positioning
- **Floor Integration**: Debug floor system Y-level coordination
- **Block Placement**: Validate block positioning accuracy
- **Camera Height**: Debug camera positioning relative to world

### `FloorTestScene.tsx` - Floor System Testing
- **Material Testing**: Debug floor materials and transparency
- **Seamless Transitions**: Test floor type transitions
- **Performance Impact**: Monitor floor system performance
- **Visual Quality**: Validate floor rendering quality

### `AdvancedMaterialTestScene.tsx` - Material System Debug
- **Material Properties**: Test all block material configurations
- **Lighting Integration**: Debug material interaction with lighting
- **Transparency Sorting**: Validate transparency rendering order
- **Performance Optimization**: Material-specific performance testing

## Debug Utilities

### `benchmarkHelpers.ts` - Testing Utilities
- **Performance Measurement**: Standardized timing and profiling functions
- **Resource Monitoring**: Memory and GPU usage tracking utilities
- **Test Data Generation**: Synthetic world data for testing scenarios

### `types.ts` - Debug Type Definitions
- **Debug Interfaces**: Type definitions for debug systems
- **Performance Metrics**: Structured data types for measurements
- **Test Configuration**: Types for benchmark and testing configuration

## Integration Features
- **Hot Key Access**: Debug panels accessible via keyboard shortcuts
- **Production Safety**: Debug features automatically disabled in production
- **Performance Impact**: Minimal overhead when debug features are inactive
- **Visual Feedback**: Clear indicators for active debug features

## Usage Patterns
- **Development Only**: Debug components check environment variables
- **Non-intrusive**: Debug UI overlays don't interfere with main application
- **Comprehensive Logging**: Integration with centralized logging system
- **Real-time Updates**: Live data streaming for immediate feedback

## Key Features
- Real-time performance monitoring with visual graphs
- Interactive system toggles for feature testing
- Comprehensive error boundaries with detailed error reporting
- Memory leak detection and GPU resource monitoring
- Automated performance regression testing

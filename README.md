# Well Log Analysis Web Application

A comprehensive web application for petrophysical analysis and well log data processing. Built with modern web technologies.

## Features

### Analysis Modules

- **SWORAD Analysis**
  - Calculate water saturation parameters
  - Configurable parameters: Tortuosity Factor, Cementation Factor, Saturation Exponent, Shale Resistivity
  - Real-time plotting and visualization

- **RGBE-RPBE Analysis**
  - Reference curve generation
  - Parameter-based calculations
  - Interactive data visualization

- **DNS-DNSV Analysis**
  - Density and neutron saturation analysis
  - Multi-well support
  - Interval-based calculations

- **RT-RO Analysis**
  - Resistivity analysis
  - Custom parameter configuration
  - Result visualization

### Core Features

- 📊 Interactive well log visualization
- 🔄 Real-time data processing
- 📱 Responsive design
- 🎯 Multi-well selection and analysis
- 📍 Interval-based calculations
- 💾 Parameter set management
- 📈 Dynamic result plotting

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/       # Dashboard routes
│   ├── data-input/        # Data input pages
│   └── seed-data/         # Seeding utilities
├── components/            # Shared components
├── contexts/             # React contexts
├── features/             # Feature modules
│   ├── sworad/          # SWORAD analysis
│   ├── rgbe-rpbe/       # RGBE-RPBE analysis
│   ├── dns-dnsv/        # DNS-DNSV analysis
│   └── rt-ro/           # RT-RO analysis
├── lib/                  # Utilities and helpers
├── public/              # Static assets
├── stores/              # State management
└── types/               # TypeScript definitions
```

## Key Components

### Parameter Management
- Unified parameter interface across modules
- Support for multiple parameter types
- Real-time validation and updates

### Data Visualization
- Interactive well log plots
- Customizable plot layouts
- Dynamic data updates

### Analysis Workflow
1. Well selection
2. Parameter configuration
3. Analysis execution
4. Result visualization

## API Integration

The application communicates with a backend API for:
- Well data retrieval
- Analysis calculations
- Result processing
- Data persistence

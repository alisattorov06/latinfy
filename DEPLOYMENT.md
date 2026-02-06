# Latinify - Deployment Guide

## 📋 Prerequisites

- Python 3.10 or higher
- pip (Python package manager)
- Git (for deployment)

## 🚀 Local Development

### 1. Clone and setup

```bash
# Clone the project
git clone <repository-url>
cd latinify

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
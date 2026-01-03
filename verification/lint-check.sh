#!/bin/bash

# =============================================================================
# Lint Check Script
# AI Orchestrator Framework - 린트 및 포맷 검사 스크립트
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AUTO_FIX=${AUTO_FIX:-false}

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# =============================================================================
# Lint Functions
# =============================================================================

check_dependencies() {
    print_header "Checking Dependencies"

    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        exit 1
    fi

    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found. Installing dependencies..."
        npm ci
    fi

    print_success "Dependencies ready"
}

run_eslint() {
    print_header "Running ESLint"

    if [ "$AUTO_FIX" = true ]; then
        print_info "Auto-fix mode enabled"
        if npm run lint:fix 2>/dev/null; then
            print_success "ESLint passed (with fixes applied)"
            return 0
        else
            print_error "ESLint failed even with auto-fix"
            return 1
        fi
    else
        if npm run lint 2>/dev/null; then
            print_success "ESLint passed"
            return 0
        else
            print_error "ESLint failed"
            print_info "Run with AUTO_FIX=true to auto-fix issues"
            return 1
        fi
    fi
}

run_prettier() {
    print_header "Running Prettier Check"

    if [ "$AUTO_FIX" = true ]; then
        print_info "Auto-fix mode enabled"
        if npm run format 2>/dev/null; then
            print_success "Prettier formatting applied"
            return 0
        else
            print_warning "Prettier format command not found, skipping"
            return 0
        fi
    else
        if npm run format:check 2>/dev/null; then
            print_success "Prettier check passed"
            return 0
        else
            print_error "Prettier check failed"
            print_info "Run with AUTO_FIX=true to auto-format"
            return 1
        fi
    fi
}

run_type_check() {
    print_header "Running TypeScript Check"

    if npm run type-check 2>/dev/null; then
        print_success "TypeScript check passed"
        return 0
    else
        print_error "TypeScript check failed"
        return 1
    fi
}

check_commit_message() {
    print_header "Checking Commit Message Format"

    # Get the last commit message
    local last_commit=$(git log -1 --pretty=%B 2>/dev/null || echo "")

    if [ -z "$last_commit" ]; then
        print_warning "No commits found, skipping commit message check"
        return 0
    fi

    # Check for conventional commit format
    local pattern="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+"

    if echo "$last_commit" | head -1 | grep -Eq "$pattern"; then
        print_success "Commit message follows Conventional Commits format"
        return 0
    else
        print_warning "Commit message does not follow Conventional Commits format"
        print_info "Expected: type(scope): description"
        print_info "Got: $(echo "$last_commit" | head -1)"
        return 0  # Warning only, don't fail
    fi
}

check_file_headers() {
    print_header "Checking File Headers"

    local issues_found=false

    # Check for common issues in source files
    for file in $(find src -name "*.ts" -o -name "*.tsx" 2>/dev/null | head -20); do
        # Check for console.log (should use logger instead)
        if grep -q "console\.log" "$file" 2>/dev/null; then
            print_warning "$file: Contains console.log (consider using logger)"
            issues_found=true
        fi

        # Check for TODO without ticket
        if grep -qE "TODO[^:]|TODO$" "$file" 2>/dev/null; then
            print_warning "$file: Contains TODO without description"
            issues_found=true
        fi
    done

    if [ "$issues_found" = false ]; then
        print_success "No file header issues found"
    fi

    return 0  # Warnings only
}

# =============================================================================
# Summary
# =============================================================================

print_summary() {
    local eslint_result=$1
    local prettier_result=$2
    local typecheck_result=$3

    print_header "Lint Check Summary"

    echo "| Check | Status |"
    echo "|-------|--------|"

    if [ $eslint_result -eq 0 ]; then
        echo "| ESLint | ✅ Pass |"
    else
        echo "| ESLint | ❌ Fail |"
    fi

    if [ $prettier_result -eq 0 ]; then
        echo "| Prettier | ✅ Pass |"
    else
        echo "| Prettier | ❌ Fail |"
    fi

    if [ $typecheck_result -eq 0 ]; then
        echo "| TypeScript | ✅ Pass |"
    else
        echo "| TypeScript | ❌ Fail |"
    fi

    echo ""

    # Overall result
    if [ $eslint_result -eq 0 ] && [ $prettier_result -eq 0 ] && [ $typecheck_result -eq 0 ]; then
        print_success "All lint checks passed!"
        return 0
    else
        print_error "Some lint checks failed"
        if [ "$AUTO_FIX" = false ]; then
            print_info "Run with AUTO_FIX=true to attempt automatic fixes"
        fi
        return 1
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    print_header "AI Orchestrator - Lint Check"

    # Parse arguments
    while [[ "$#" -gt 0 ]]; do
        case $1 in
            --fix) AUTO_FIX=true ;;
            *) print_warning "Unknown parameter: $1" ;;
        esac
        shift
    done

    local eslint_result=0
    local prettier_result=0
    local typecheck_result=0

    # Check dependencies
    check_dependencies

    # Run ESLint
    run_eslint || eslint_result=1

    # Run Prettier
    run_prettier || prettier_result=1

    # Run TypeScript check
    run_type_check || typecheck_result=1

    # Check commit message (informational only)
    check_commit_message

    # Check file headers (informational only)
    check_file_headers

    # Print summary
    print_summary $eslint_result $prettier_result $typecheck_result
}

# =============================================================================
# Usage
# =============================================================================

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --fix    Enable auto-fix mode (runs lint:fix and format)"
    echo ""
    echo "Environment Variables:"
    echo "  AUTO_FIX=true    Same as --fix option"
    echo ""
    echo "Examples:"
    echo "  $0              # Check only"
    echo "  $0 --fix        # Check and fix"
    echo "  AUTO_FIX=true $0 # Check and fix via env"
}

# Check for help
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function
main "$@"

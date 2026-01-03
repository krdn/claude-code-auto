#!/bin/bash

# =============================================================================
# Test Runner Script
# AI Orchestrator Framework - 테스트 자동화 스크립트
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COVERAGE_THRESHOLD=${COVERAGE_THRESHOLD:-80}
MAX_RETRIES=${MAX_RETRIES:-3}

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
# Test Functions
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

run_type_check() {
    print_header "Running Type Check"

    if npm run type-check 2>/dev/null; then
        print_success "Type check passed"
        return 0
    else
        print_error "Type check failed"
        return 1
    fi
}

run_lint() {
    print_header "Running Lint"

    if npm run lint 2>/dev/null; then
        print_success "Lint passed"
        return 0
    else
        print_error "Lint failed"
        return 1
    fi
}

run_tests() {
    print_header "Running Tests"

    local retry_count=0
    local test_passed=false

    while [ $retry_count -lt $MAX_RETRIES ]; do
        if npm test -- --coverage --passWithNoTests 2>/dev/null; then
            test_passed=true
            break
        fi

        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            print_warning "Test failed. Retry $retry_count of $MAX_RETRIES..."
            sleep 2
        fi
    done

    if [ "$test_passed" = true ]; then
        print_success "All tests passed"
        return 0
    else
        print_error "Tests failed after $MAX_RETRIES attempts"
        return 1
    fi
}

check_coverage() {
    print_header "Checking Coverage"

    if [ ! -f "coverage/coverage-summary.json" ]; then
        print_warning "Coverage report not found"
        return 0
    fi

    local coverage=$(cat coverage/coverage-summary.json | jq '.total.lines.pct' 2>/dev/null || echo "0")

    print_info "Current coverage: ${coverage}%"
    print_info "Threshold: ${COVERAGE_THRESHOLD}%"

    if (( $(echo "$coverage >= $COVERAGE_THRESHOLD" | bc -l) )); then
        print_success "Coverage threshold met"
        return 0
    else
        print_warning "Coverage below threshold (${coverage}% < ${COVERAGE_THRESHOLD}%)"
        return 1
    fi
}

run_build() {
    print_header "Running Build"

    if npm run build 2>/dev/null; then
        print_success "Build successful"
        return 0
    else
        print_error "Build failed"
        return 1
    fi
}

# =============================================================================
# Summary
# =============================================================================

print_summary() {
    local type_check_result=$1
    local lint_result=$2
    local test_result=$3
    local coverage_result=$4
    local build_result=$5

    print_header "Test Summary"

    echo "| Check | Status |"
    echo "|-------|--------|"

    if [ $type_check_result -eq 0 ]; then
        echo "| Type Check | ✅ Pass |"
    else
        echo "| Type Check | ❌ Fail |"
    fi

    if [ $lint_result -eq 0 ]; then
        echo "| Lint | ✅ Pass |"
    else
        echo "| Lint | ❌ Fail |"
    fi

    if [ $test_result -eq 0 ]; then
        echo "| Tests | ✅ Pass |"
    else
        echo "| Tests | ❌ Fail |"
    fi

    if [ $coverage_result -eq 0 ]; then
        echo "| Coverage | ✅ Pass |"
    else
        echo "| Coverage | ⚠️ Below threshold |"
    fi

    if [ $build_result -eq 0 ]; then
        echo "| Build | ✅ Pass |"
    else
        echo "| Build | ❌ Fail |"
    fi

    echo ""

    # Overall result
    if [ $type_check_result -eq 0 ] && [ $lint_result -eq 0 ] && [ $test_result -eq 0 ] && [ $build_result -eq 0 ]; then
        print_success "All checks passed!"
        return 0
    else
        print_error "Some checks failed"
        return 1
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    print_header "AI Orchestrator - Test Runner"

    local type_check_result=0
    local lint_result=0
    local test_result=0
    local coverage_result=0
    local build_result=0

    # Check dependencies
    check_dependencies

    # Run type check
    run_type_check || type_check_result=1

    # Run lint
    run_lint || lint_result=1

    # Run tests
    run_tests || test_result=1

    # Check coverage
    check_coverage || coverage_result=1

    # Run build
    run_build || build_result=1

    # Print summary
    print_summary $type_check_result $lint_result $test_result $coverage_result $build_result
}

# Run main function
main "$@"

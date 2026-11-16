#!/bin/sh
# Run from the PM Circle Laravel project directory AFTER extracting changed files.
set -eu
if [ ! -f artisan ] || [ ! -f resources/js/components/exam/examCountdownMath.ts ]; then
    echo 'Run this from the PM Circle project root after extracting the changed files.' >&2
    exit 1
fi
old=resources/js/components/exam/examTimeProgress.ts
new=resources/js/components/exam/examCountdownMath.ts
if [ -f "$old" ]; then
    if cmp -s "$old" "$new"; then
        rm "$old"
        printf 'Removed the obsolete case-conflicting countdown module.\n'
    else
        echo 'The old countdown utility differs from the new file. Review/merge local edits before removing it.' >&2
        exit 1
    fi
fi
php tests/Regression/ExamResultLayoutImportCheck.php
php tests/Regression/ExamTimerFooterStaticCheck.php
printf 'Hotfix source checks passed. Next run npm run types:check && npm run build.\n'

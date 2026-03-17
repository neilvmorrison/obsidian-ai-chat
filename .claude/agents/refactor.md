# Role

Optimizing existing code without changing behaviour.

# Smells to target

- Long files: files over 300 lines should be broken out into modules, organized by concern(s) in a directory(ies) and then imported into the original file
- Bad/unrigorous type definitions - no any, unknown should only be used where other types are impractical/cumbersome
- Code repetition: multiple methods accomplishing the same thing should be abstracted, imported and called
- Bad css cascade: should avoid using !important where possible, redundant style definitions, hard-coded color and spacing values (should be variables)

# Hard constraints

- never add features

# Process

1. read
2. Identify: areas of redundancy, anti-patterns within the codebase, opportunities to DRY up the codebase
3. plan
4. confirm if large
5. apply
6. verify

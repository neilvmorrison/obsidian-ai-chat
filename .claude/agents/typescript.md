# Role

You are the agent responsible for all business logic for this plugin. Your domain is typescript and need to steer clear of all UI-related development

# Patterns to enforce

- Strict TS rules
- Always async/await
- State should be hoisted to the highest practical level within the feature to facilitate easier state-management across the app
- Atomic methods - our business logic should be composed of many small, single-concern methods that are easy to test

# File Placement

- Follow the existing directory structure, adding clear directories in the `src/` dir where necessary.
- If a module needs abstracting to hit our max. 300 line target, create a directory to house all of the modules and export all modules from `/src/*/[module_name]/index.ts`

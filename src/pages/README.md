## File-based Routing

Routes will be auto-generated for Vue files in this dir with the same file structure.
Check out [`unplugin-vue-router`](https://github.com/posva/unplugin-vue-router) for more details.
Now [`migrated`](https://github.com/vuejs/router/pull/2603) to [`vue router`](https://router.vuejs.org) for more details.

### Path Aliasing

`~/` is aliased to `./src/` folder.

For example, instead of having

```ts
import { isDark } from '../../../../composables'
```

now, you can use

```ts
import { isDark } from '~/composables'
```

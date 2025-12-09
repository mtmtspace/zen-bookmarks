# Zen Bookmarks

一个替换新标签页的书签导航插件，支持键盘操作、三点菜单、搜索、分组与撤销/重做等功能。

## 目录结构
- `src/`：主源码（`App.tsx`, `main.tsx`, `components/`, `services/`, `types.ts`, `index.css`）
- `public/`：静态资源（图标、赞赏码图片等）
- `dist/`：构建产物（每次构建会重新生成）

## 开发
1. 安装依赖：`npm install`
2. 启动开发：`npm run dev`
3. 构建发布：`npm run build`

## 加载扩展
1. 运行 `npm run build` 生成 `dist/`
2. 在浏览器扩展页面选择“加载已解压的扩展程序”，指向 `dist/`

## 备注
- 不再使用 `.env.local`、`metadata.json` 等无关文件。
- 赞赏码图片存放在 `public/`，构建时会自动复制到输出。

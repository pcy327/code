import { createBrowserRouter } from 'react-router-dom';
import routes from './routes';

/**
 * 创建 Router 实例。
 * createBrowserRouter 是 React Router v6.4+ 推荐的 API，
 * 返回 router 对象，由 <RouterProvider> 消费。
 *
 * 与 BrowserRouter 不同，它使用配置式数组（routes.js），
 * 天然适合做路由表：路径、组件、权限集中管理。
 */
const router = createBrowserRouter(routes);

export default router;

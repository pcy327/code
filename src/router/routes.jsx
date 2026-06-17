import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import AuthGuard from './AuthGuard';

// 页面组件（懒加载）
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Workspace = lazy(() => import('../pages/Workspace'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const SharedNotePage = lazy(() => import('../pages/SharedNotePage'));
const TrashPage = lazy(() => import('../pages/TrashPage'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

function Lazy({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

/**
 * 路由表 — 项目里唯一定义路由的地方
 *
 * 每项字段：
 *   path       URL 路径
 *   element    渲染内容
 *   children   嵌套子路由
 *   index      true 表示默认子路由
 *
 * AuthGuard 作为布局组件包裹需登录的路由群组，
 * 未登录时自动跳转 /login，已登录时渲染 <Outlet /> 显示子页面。
 */
const routes = [
  // ====== 公开路由 ======
  { path: '/login',    element: <Lazy><Login /></Lazy> },
  { path: '/register', element: <Lazy><Register /></Lazy> },
  { path: '/shared/:token', element: <Lazy><SharedNotePage /></Lazy> },

  // ====== 需登录路由（AuthGuard 统一校验） ======
  {
    element: <AuthGuard />,
    children: [
      { index: true,                         element: <Lazy><Dashboard /></Lazy> },
      { path: 'trash',                       element: <Lazy><TrashPage /></Lazy> },
      { path: 'workspace/:noteId?',          element: <Lazy><Workspace /></Lazy> },
    ],
  },

  // ====== 兜底重定向 ======
  { path: '*', element: <Navigate to="/" replace /> },
];

export default routes;

import { createBrowserRouter } from "react-router";
import { MainLayout } from "./layouts/MainLayout";
import { Workspace } from "./pages/Workspace";
import { ProductPage } from "./pages/ProductPage";
import { OrderPage } from "./pages/OrderPage";
import { MeetingRoomPage } from "./pages/MeetingRoomPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      {
        index: true,
        Component: Workspace,
      },
      {
        path: "products",
        Component: ProductPage,
      },
      {
        path: "orders",
        Component: OrderPage,
      },
      {
        path: "meetings",
        Component: MeetingRoomPage,
      },
    ],
  },
]);

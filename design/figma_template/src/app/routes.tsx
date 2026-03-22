import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/layouts/RootLayout";
import { LoginPage } from "./components/pages/LoginPage";
import { RegisterPage } from "./components/pages/RegisterPage";
import { GroupListPage } from "./components/pages/GroupListPage";
import { GroupDetailPage } from "./components/pages/GroupDetailPage";
import { AddExpensePage } from "./components/pages/AddExpensePage";
import { EditExpensePage } from "./components/pages/EditExpensePage";
import { SettlementPage } from "./components/pages/SettlementPage";
import { ProfilePage } from "./components/pages/ProfilePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: LoginPage },
      { path: "register", Component: RegisterPage },
      { path: "groups", Component: GroupListPage },
      { path: "groups/:groupId", Component: GroupDetailPage },
      { path: "groups/:groupId/add-expense", Component: AddExpensePage },
      { path: "groups/:groupId/expenses/:expenseId/edit", Component: EditExpensePage },
      { path: "groups/:groupId/settlement", Component: SettlementPage },
      { path: "profile", Component: ProfilePage },
    ],
  },
]);

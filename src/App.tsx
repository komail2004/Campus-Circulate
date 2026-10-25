import { Route, Routes } from "react-router";
import Layout from "./components/Layout.tsx";
import BrowsePage from "./pages/BrowsePage.tsx";
import CreateListingPage from "./pages/CreateListingPage.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";
import MessagesPage from "./pages/MessagesPage.tsx";
import DealsPage from "./pages/DealsPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import LoginPage from "./pages/LoginPage.tsx";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BrowsePage />} />
        <Route path="sell" element={<CreateListingPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;

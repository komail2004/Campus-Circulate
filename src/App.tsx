import { Route, Routes } from "react-router";
import Layout from "./components/Layout.tsx";
import RequireAuth from "./components/RequireAuth.tsx";
import AccountPage from "./pages/AccountPage.tsx";
import BrowsePage from "./pages/BrowsePage.tsx";
import CreateListingPage from "./pages/CreateListingPage.tsx";
import DealPage from "./pages/DealPage.tsx";
import DealsPage from "./pages/DealsPage.tsx";
import EditListingPage from "./pages/EditListingPage.tsx";
import ListingPage from "./pages/ListingPage.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* anyone can browse */}
        <Route index element={<BrowsePage />} />
        <Route path="listings/:listingId" element={<ListingPage />} />
        <Route path="students/:userId" element={<ProfilePage />} />

        {/* selling, deals and the account need a signed-in student */}
        <Route element={<RequireAuth />}>
          <Route path="sell" element={<CreateListingPage />} />
          <Route path="listings/:listingId/edit" element={<EditListingPage />} />
          <Route path="deals" element={<DealsPage />} />
          <Route path="deals/:dealId" element={<DealPage />} />
          <Route path="account" element={<AccountPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;

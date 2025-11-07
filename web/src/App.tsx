import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import Layout from "./components/Layout";
import AssetsList from "./pages/AssetsList";
import AssetViewer from "./pages/AssetViewer";
import UploadPage from "./pages/UploadPage";

const App = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<AssetsList />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/assets/:id" element={<AssetViewer />} />
        </Routes>
      </Layout>
      <Toaster />
    </BrowserRouter>
  );
};

export default App;


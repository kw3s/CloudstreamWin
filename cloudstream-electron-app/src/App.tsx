import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { DetailsPage } from './pages/DetailsPage';
import { PlayerPage } from './pages/PlayerPage';
import ExtensionsPage from './pages/PluginsPage';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="details" element={<DetailsPage />} />
          <Route path="player" element={<PlayerPage />} />
          <Route path="plugins" element={<ExtensionsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;

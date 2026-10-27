import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './discovery.css';
import { initializeNativeAuth } from './native-auth';

function Application() {
  React.useEffect(() => {
    void initializeNativeAuth();
  }, []);
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Application />
  </React.StrictMode>,
);

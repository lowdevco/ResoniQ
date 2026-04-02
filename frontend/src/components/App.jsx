import React from "react";
import ReactDOM from "react-dom/client";

const App = () => {
  return (
    <div>
      <h1>Testing React Code</h1>
    </div>
  );
};

export default App;

const appDiv = document.getElementById("app");
ReactDOM.createRoot(appDiv).render(<App />);

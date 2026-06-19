import React from "react";
import ReactDOM from "react-dom/client";
import App from "./components/App";
import "./index.css";
import { BrowserRouter } from "react-router-dom";

const appDiv = document.getElementById("app");
ReactDOM.createRoot(appDiv).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

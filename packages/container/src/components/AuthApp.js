import React, { useRef, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { mount } from "auth/authApp";

export default function AuthApp({ onSignIn }) {
  const ref = useRef(null);
  const history = useHistory();

  useEffect(() => {
    const { onParentNavigate } = mount(ref.current, {
      initialPath: history.location.pathname,
      onNavigate: ({ pathname: nextPathname }) => {
        const { pathname } = history.location;
        if (pathname === nextPathname) return;
        history.push(nextPathname);
      },
      onSignIn,
    });

    history.listen(onParentNavigate);
  }, []);
  return <div ref={ref} />;
}

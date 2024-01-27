"use client";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import Link from "next/link";

const Navbar: React.FC = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link href="/" passHref>
            CFTracker
          </Link>
        </Typography>
        <Button color="inherit">
          <Link href="/" passHref>
            Home
          </Link>
        </Button>
        <Button color="inherit">
          <Link href="/shared-contests" passHref>
            Shared Contest
          </Link>
        </Button>
        {/* Add more buttons or links as needed */}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

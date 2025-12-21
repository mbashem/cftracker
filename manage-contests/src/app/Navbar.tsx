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
        <Button component={Link} href="/" color="inherit" >
          Home
        </Button>
        <Button component={Link} href="/shared-contests" color="inherit">
          Shared Contest
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

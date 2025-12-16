"use client";
import { AppBar, Toolbar, Typography, Button, Stack } from "@mui/material";
import Link from "next/link";

const Navbar: React.FC = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Link href="/" passHref>
              CFTracker
            </Link>
          </Typography>
          <Link href="/" passHref>
            Home
          </Link>
          <Link href="/shared-contests" passHref>
            Shared Contest
          </Link>
        </Stack>
        {/* Add more buttons or links as needed */}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

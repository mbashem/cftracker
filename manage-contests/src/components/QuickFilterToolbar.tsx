import { InputAdornment, TextField } from "@mui/material";
import { GridSearchIcon, QuickFilter, QuickFilterClear, QuickFilterControl, Toolbar } from "@mui/x-data-grid";
import CancelIcon from "@mui/icons-material/Cancel";

function QuickFIlterToolbar() {
  return (
    <Toolbar>
      <QuickFilter style={{ display: "grid", width: "100%" }}>
        <QuickFilterControl
          render={({ ref, ...controlProps }, state) => (
            <TextField
              {...controlProps}
              inputRef={ref}
              aria-label="Search"
              placeholder="Search..."
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <GridSearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: state.value ? (
                    <InputAdornment position="end">
                      <QuickFilterClear
                        edge="end"
                        size="small"
                        aria-label="Clear search"
                        material={{ sx: { marginRight: -0.75 } }}
                      >
                        <CancelIcon fontSize="small" />
                      </QuickFilterClear>
                    </InputAdornment>
                  ) : null,
                  ...controlProps.slotProps?.input,
                },
                ...controlProps.slotProps,
              }}
            />
          )}
        />
      </QuickFilter>
    </Toolbar>
  );
}

export default QuickFIlterToolbar;

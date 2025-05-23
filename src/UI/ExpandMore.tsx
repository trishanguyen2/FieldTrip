import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { IconButton, IconButtonProps, Tooltip, styled } from "@mui/material";

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
  title: string;
}

export const ExpandMore = styled(
  ({ expand, title, ...other }: ExpandMoreProps) => {
    return (
      <Tooltip title={title}>
        <IconButton {...other}>
          <ExpandMoreIcon />
        </IconButton>
      </Tooltip>
    );
  },
)(({ theme }) => ({
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
  variants: [
    {
      props: ({ expand }) => !expand,
      style: {
        transform: "rotate(0deg)",
      },
    },
    {
      props: ({ expand }) => !!expand,
      style: {
        transform: "rotate(180deg)",
      },
    },
  ],
}));

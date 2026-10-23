# StatusTile

`StatusTile` implements the component set `9924:27054`. The set publishes two
variants, `Orientation=Horizontal` and `Orientation=Vertical`, on a 312px
column; the article keeps the source 16px inset, 8px gap and 8px radius.

| Source layer      | Code                                                   |
| ----------------- | ------------------------------------------------------ |
| `Channel-Wrapper` | `channel`: the 24px artwork slot beside the title      |
| `Title`           | `title`: 16/22 semibold, `text-label-sb`               |
| `Tag`             | `tag`: caller-owned `Tag`, beside the title or stacked |
| `Body-Text`       | `children`: 14/20 muted, wraps at the content width    |

`orientation` maps the source axis: `"horizontal"` keeps the header row with
the channel and title on the left and the tag on the right; `"vertical"` stacks
the tag under the channel/wrapper row. The surface is the source 1px border
over the background with the 8px radius. A caller may pass `className` for the
outer width; the source itself is a FILL column.

The channel is decoration: the component hides its wrapper from assistive
technology and the caller supplies the meaningful title. The tag keeps its own
semantics. Every rendered string is consumer-owned; there is no built-in copy.

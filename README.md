# Property Search With Map & Filters

A frontend proof of concept built for the Iceberg X R&D internship. It is a standalone property search page with a filter panel, a list of property cards and an interactive map, all running on mock data. Users can filter by location, price range, property type, bedroom count and listing status. Selecting a card highlights its marker on the map, and selecting a marker highlights its card in the list.

## Chosen stack

| Area      | Choice                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| Framework | React + TypeScript, built with Vite                                                                                  |
| Styling   | Tailwind CSS                                                                                                         |
| Map       | Leaflet 1.9.x + react-leaflet 5 (needs React 19)                                                                     |
| Tiles     | OpenStreetMap standard tiles in development; CARTO basemaps optional (needs a free API key)                          |
| State     | `useState` for filters, selected and hovered property; `filteredProperties` derived with `useMemo` (no global store) |

The reasons for these choices are in the [research report](reports/research-report.en.md#2-map-technology).

## Planned folder structure

The app has not been scaffolded yet. Planned layout:

```
src/
  components/   # FilterPanel, PropertyList, PropertyCard, PropertyMap, ...
  data/         # mock properties
  types/        # Property, Filters, ...
  hooks/        # e.g. useFilteredProperties
```

The existing top-level `components/`, `data/` and `feature/` folders only contain `.gitkeep` placeholders. They will be replaced by the `src/` layout when the app is scaffolded.

## Docs and reports

- [Mission](docs/mission.md)
- [Architecture notes](docs/architecture.md)
- [Research report (English)](reports/research-report.en.md)
- [Araştırma raporu (Türkçe)](reports/research-report.tr.md)

## License

[Apache License 2.0](LICENSE)

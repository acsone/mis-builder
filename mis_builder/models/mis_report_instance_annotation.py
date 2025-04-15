# Copyright 2025 ACSONE SA/NV
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).


from odoo import api, fields, models

from .kpimatrix import KpiMatrix


class MisReportInstanceAnnotation(models.Model):
    _name = "mis.report.instance.annotation"
    _description = "Mis Report Instance Annotation"

    period_id = fields.Many2one(
        comodel_name="mis.report.instance.period",
        ondelete="cascade",
        required=True,
    )
    kpi_id = fields.Many2one(
        comodel_name="mis.report.kpi",
        ondelete="cascade",
        required=True,
    )
    subkpi_id = fields.Many2one(
        comodel_name="mis.report.subkpi",
        ondelete="cascade",
    )
    note = fields.Char()

    annotation_context = fields.Json(
        help="""
        Context used when adding annotation
        """
    )

    _sql_constraints = [
        (
            "annotation_unique",
            "unique(period_id, kpi_id,subkpi_id)",
            "Only one annotation per cell(defined using period,kpi,sub kpi)",
        ),
    ]

    def init(self):
        self.env.cr.execute(
            """
                CREATE INDEX IF NOT EXISTS
                mis_report_instance_annotation_period_id_kpi_id_subkpi_id_idx
                ON mis_report_instance_annotation(period_id,kpi_id,subkpi_id);
            """
        )

    @api.model
    def get_first_matching_annotation(self, cell_id, instance_id):
        """
        Return first annoation
        matching exactly the period,kpi,subkpi and annotation context
        """

        kpi_id, _, period_id, subkpi_id = KpiMatrix._unpack_cell_id(cell_id)

        annotations = self.env["mis.report.instance.annotation"].search(
            [
                ("period_id", "=", period_id),
                ("kpi_id", "=", kpi_id),
                ("subkpi_id", "=", subkpi_id),
            ],
        )
        annotation_context = (
            self.env["mis.report.instance"]
            .browse(instance_id)
            ._get_annotation_context()
        )
        annotation = fields.first(
            annotations.filtered(
                lambda rec: rec.annotation_context == annotation_context
            )
        )
        return annotation

    @api.model
    def set_annotation(self, cell_id, instance_id, note):
        annotation = self.get_first_matching_annotation(cell_id, instance_id)

        if annotation:
            annotation.note = note
        else:
            kpi_id, _, period_id, subkpi_id = KpiMatrix._unpack_cell_id(cell_id)
            self.env["mis.report.instance.annotation"].create(
                {
                    "period_id": period_id,
                    "kpi_id": kpi_id,
                    "subkpi_id": subkpi_id,
                    "note": note,
                    "annotation_context": self.env["mis.report.instance"]
                    .browse(instance_id)
                    ._get_annotation_context(),
                }
            )

    @api.model
    def remove_annotation(self, cell_id, instance_id):
        annotation = self.get_first_matching_annotation(cell_id, instance_id)
        if annotation:
            annotation.unlink()
